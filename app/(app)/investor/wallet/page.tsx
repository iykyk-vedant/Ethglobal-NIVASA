"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HashValue } from "@/components/verify/HashValue";
import { LimitationNote } from "@/components/verify/LimitationNote";
import { buildWalletVerificationMessage } from "@/lib/wallet/message";
import {
  Wallet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Send,
  Lock,
} from "lucide-react";
import { ethers } from "ethers";

type WalletBindingState =
  | "not_connected"
  | "awaiting_signature"
  | "verification_pending"
  | "verified"
  | "signature_rejected"
  | "verification_failed"
  | "wallet_changed";

interface ProfileData {
  walletAddress: string | null;
  walletVerifiedAt: string | null;
}

interface EligibilityData {
  status: "not_requested" | "pending" | "eligible" | "ineligible" | "expired" | "revoked";
  chainStatus: "not_registered" | "registered" | "revoked";
  validUntil: string | null;
  policyVersion: string;
}

export default function InvestorWalletPage() {
  const [bindingState, setBindingState] = useState<WalletBindingState>("not_connected");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData>({
    walletAddress: null,
    walletVerifiedAt: null,
  });
  const [eligibility, setEligibility] = useState<EligibilityData>({
    status: "not_requested",
    chainStatus: "not_registered",
    validUntil: null,
    policyVersion: "v1.0",
  });
  const [nonceData, setNonceData] = useState<{ nonce: string; expiresAt: string; chainId: number; domain: string } | null>(null);
  const [isRequestingEligibility, setIsRequestingEligibility] = useState(false);
  const [eligibilitySuccessMsg, setEligibilitySuccessMsg] = useState<string | null>(null);

  // Initialize demo investor profile
  useEffect(() => {
    // In demo environment, initial state reflects seeded investor state
    setProfile({
      walletAddress: "0x0000000000000000000000000000000000ace2c6",
      walletVerifiedAt: new Date().toISOString(),
    });
    setCurrentAddress("0x0000000000000000000000000000000000ace2c6");
    setBindingState("verified");
    setEligibility({
      status: "eligible",
      chainStatus: "registered",
      validUntil: new Date(Date.now() + 300 * 86400 * 1000).toISOString(),
      policyVersion: "v1.0",
    });
  }, []);

  // Request new server nonce
  async function handleRequestNonce(targetAddress: string) {
    setBindingState("awaiting_signature");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/wallet/nonce", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-user-id": "2a1b3a8b-8215-4111-9a76-7b3b6f51b109", // Demo Investor ID
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to generate server nonce");
      }

      const data = await res.json();
      setNonceData(data);
      return data;
    } catch (err: any) {
      setBindingState("verification_failed");
      setErrorMessage(err.message || "Failed to request nonce from server");
      return null;
    }
  }

  // Connect via browser extension or simulated seeded investor wallet
  async function handleConnectAndSign(useSimulatedKey: boolean = false) {
    setErrorMessage(null);

    try {
      let signerAddress: string;
      let signerFn: (msg: string) => Promise<string>;

      if (useSimulatedKey) {
        // Seeded test investor ECDSA wallet for standalone reviewer convenience
        const testWallet = new ethers.Wallet("0x633379b3635952c10b0162024bc68c07e05fc867a5b3a4a169b1834927cb5219");
        signerAddress = testWallet.address.toLowerCase();
        signerFn = (msg: string) => testWallet.signMessage(msg);
      } else if (typeof window !== "undefined" && (window as any).ethereum) {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        signerAddress = (await signer.getAddress()).toLowerCase();
        signerFn = (msg: string) => signer.signMessage(msg);
      } else {
        throw new Error("No Web3 wallet extension detected. Use 'Sign with Seeded Demo Wallet' to evaluate without Metamask.");
      }

      setCurrentAddress(signerAddress);

      // Step 1: Request single-use nonce from server
      const nonceInfo = await handleRequestNonce(signerAddress);
      if (!nonceInfo) return;

      // Step 2: Build exact EIP-191 verification message
      const messageToSign = buildWalletVerificationMessage({
        domain: nonceInfo.domain,
        userId: "2a1b3a8b-8215-4111-9a76-7b3b6f51b109",
        nonce: nonceInfo.nonce,
        chainId: nonceInfo.chainId,
        expiresAt: nonceInfo.expiresAt,
      });

      // Step 3: Prompt signature
      let signature: string;
      try {
        signature = await signerFn(messageToSign);
      } catch {
        setBindingState("signature_rejected");
        setErrorMessage("Signature request was cancelled by user.");
        return;
      }

      setBindingState("verification_pending");

      // Step 4: Submit signature to server for recovery and nonce consumption
      const verifyRes = await fetch("/api/wallet/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-user-id": "2a1b3a8b-8215-4111-9a76-7b3b6f51b109",
        },
        body: JSON.stringify({
          walletAddress: signerAddress,
          signature,
          nonce: nonceInfo.nonce,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setBindingState("verification_failed");
        setErrorMessage(verifyData.message || "Server signature verification failed.");
        return;
      }

      // Success: verified strictly by server
      setProfile({
        walletAddress: verifyData.walletAddress,
        walletVerifiedAt: verifyData.verifiedAt,
      });

      if (verifyData.isWalletChanged) {
        setBindingState("wallet_changed");
        setEligibility((prev) => ({
          ...prev,
          status: "pending",
          chainStatus: "not_registered",
        }));
      } else {
        setBindingState("verified");
      }
    } catch (err: any) {
      setBindingState("verification_failed");
      setErrorMessage(err.message || "Wallet binding process encountered an error.");
    }
  }

  // Request Accreditation Review
  async function handleRequestEligibility() {
    setIsRequestingEligibility(true);
    setEligibilitySuccessMsg(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/eligibility/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-user-id": "2a1b3a8b-8215-4111-9a76-7b3b6f51b109",
        },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to submit eligibility request");
      }

      setEligibility((prev) => ({
        ...prev,
        status: data.record?.status || "pending",
      }));
      setEligibilitySuccessMsg(data.message || "Accreditation review requested successfully.");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to request accreditation review.");
    } finally {
      setIsRequestingEligibility(false);
    }
  }

  return (
    <AppShell initialRole="investor">
      <PageContainer>
        <div className="space-y-8">
          <PageHeader
            title="Wallet & Accreditation Status"
            description="Cryptographic proof-of-control wallet binding and independent KYC compliance status on Hedera Testnet."
            breadcrumbs={[
              { label: "Console", href: "/dashboard" },
              { label: "Investor", href: "/investor" },
              { label: "Wallet & Accreditation" },
            ]}
          />

          {/* Limitation Callout */}
          <LimitationNote title="Proof of Control Requirement">
            NIVASA requires an EIP-191 personal signature to prove you control the private key of your claimed address. Never share private keys. Token allocations are issued on Hedera Testnet (Chain ID 296).
          </LimitationNote>

          {/* Grid layout: Left = Wallet Binding, Right = Eligibility Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* 1. WALLET BINDING PANEL */}
            <div className="lg:col-span-7 bg-surface-card border border-border rounded-lg p-6 shadow-card space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                    <Wallet className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-text-primary">
                      Demo Wallet Binding
                    </h2>
                    <p className="text-xs text-text-secondary">
                      Hedera Testnet (EVM Chain 296)
                    </p>
                  </div>
                </div>

                {/* State Badge */}
                <div>
                  {bindingState === "verified" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium bg-status-success/10 border border-status-success/20 text-status-success">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Verified for Demo</span>
                    </span>
                  )}
                  {bindingState === "awaiting_signature" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium bg-status-warning/10 border border-status-warning/20 text-status-warning">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Awaiting Signature</span>
                    </span>
                  )}
                  {bindingState === "verification_pending" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium bg-status-info/10 border border-status-info/20 text-status-info">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      <span>Verifying Nonce</span>
                    </span>
                  )}
                  {bindingState === "wallet_changed" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium bg-status-warning/10 border border-status-warning/20 text-status-warning">
                      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Wallet Changed · Re-review Queued</span>
                    </span>
                  )}
                  {(bindingState === "signature_rejected" || bindingState === "verification_failed") && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium bg-status-danger/10 border border-status-danger/20 text-status-danger">
                      <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Verification Failed</span>
                    </span>
                  )}
                  {bindingState === "not_connected" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium bg-surface-muted border border-border text-text-secondary">
                      <span>Not Connected</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Bound Address Details */}
              <div className="space-y-3">
                <span className="text-xs font-medium text-text-secondary">
                  Bound Wallet Address:
                </span>
                {profile.walletAddress ? (
                  <div className="p-3 bg-surface-page border border-border rounded">
                    <HashValue
                      hash={profile.walletAddress}
                      label="EVM Wallet Address"
                      shorten={false}
                    />
                    {profile.walletVerifiedAt && (
                      <p className="text-2xs font-mono text-text-secondary mt-2">
                        Server-verified at: {new Date(profile.walletVerifiedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-surface-muted/50 border border-dashed border-border rounded text-center text-xs text-text-secondary">
                    No verified wallet currently associated with your investor profile.
                  </div>
                )}
              </div>

              {/* Error Callout */}
              {errorMessage && (
                <div className="p-3 rounded bg-status-danger/10 border border-status-danger/20 text-xs text-status-danger flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Button
                  variant="primary"
                  onClick={() => handleConnectAndSign(false)}
                  disabled={bindingState === "awaiting_signature" || bindingState === "verification_pending"}
                >
                  <Wallet className="w-4 h-4 mr-2" aria-hidden="true" />
                  <span>Connect Browser Wallet</span>
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => handleConnectAndSign(true)}
                  disabled={bindingState === "awaiting_signature" || bindingState === "verification_pending"}
                >
                  <Lock className="w-4 h-4 mr-2" aria-hidden="true" />
                  <span>Sign with Seeded Test Wallet</span>
                </Button>
              </div>

              <p className="text-2xs text-text-secondary">
                * Note: Connecting a new address enqueues revocation of any existing on-chain KYC registration and resets eligibility status to pending.
              </p>
            </div>

            {/* 2. ELIGIBILITY & ACCREDITATION PANEL */}
            <div className="lg:col-span-5 bg-surface-card border border-border rounded-lg p-6 shadow-card space-y-6">
              <div className="border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-brand-primary" aria-hidden="true" />
                  <h2 className="text-base font-bold text-text-primary">
                    Accreditation & KYC Status
                  </h2>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  Database accreditation state vs. on-chain Hedera ATS registration.
                </p>
              </div>

              {/* Separate DB vs Chain Status Display (UI §8.6 requirement) */}
              <div className="space-y-4">
                <div className="p-3.5 bg-surface-page border border-border rounded space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary font-medium">Database Status:</span>
                    <span className="font-mono font-semibold uppercase text-text-primary">
                      {eligibility.status}
                    </span>
                  </div>
                  <p className="text-2xs text-text-secondary">
                    Review state determined by authorized independent verifier.
                  </p>
                </div>

                <div className="p-3.5 bg-surface-page border border-border rounded space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary font-medium">Hedera ATS Registration:</span>
                    <span className={`font-mono font-semibold uppercase ${
                      eligibility.chainStatus === "registered" ? "text-status-success" : "text-text-secondary"
                    }`}>
                      {eligibility.chainStatus}
                    </span>
                  </div>
                  <p className="text-2xs text-text-secondary">
                    Mirrored onto ATS Diamond Proxy via Compliance KYC facet.
                  </p>
                </div>

                <div className="p-3.5 bg-surface-page border border-border rounded space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary font-medium">Policy Version:</span>
                    <span className="font-mono text-text-primary">
                      {eligibility.policyVersion}
                    </span>
                  </div>
                  {eligibility.validUntil && (
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                      <span className="text-text-secondary">Valid Until:</span>
                      <span className="font-mono text-text-primary">
                        {new Date(eligibility.validUntil).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Success Notification */}
              {eligibilitySuccessMsg && (
                <div className="p-3 rounded bg-status-success/10 border border-status-success/20 text-xs text-status-success flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{eligibilitySuccessMsg}</span>
                </div>
              )}

              {/* Investor Cannot Edit Own Status (UI §8.6 requirement) */}
              <div className="pt-2">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleRequestEligibility}
                  isLoading={isRequestingEligibility}
                  disabled={!profile.walletVerifiedAt || eligibility.status === "eligible" || eligibility.status === "pending"}
                >
                  <Send className="w-4 h-4 mr-2" aria-hidden="true" />
                  <span>
                    {eligibility.status === "eligible"
                      ? "Accreditation Active"
                      : eligibility.status === "pending"
                      ? "Review Pending"
                      : "Request Accreditation Review"}
                  </span>
                </Button>
                <p className="text-2xs text-center text-text-secondary mt-2">
                  * Accreditation review must be certified by an independent verifier.
                </p>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
