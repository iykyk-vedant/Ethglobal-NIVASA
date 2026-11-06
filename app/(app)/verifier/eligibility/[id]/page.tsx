"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { HashValue } from "@/components/verify/HashValue";
import { LimitationNote } from "@/components/verify/LimitationNote";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  UserCheck,
  Lock,
  RotateCcw,
} from "lucide-react";

interface EligibilityRecord {
  id: string;
  userId: string;
  offeringId: string | null;
  status: "pending" | "eligible" | "ineligible" | "revoked";
  chainStatus: "not_registered" | "registered" | "revoked";
  policyVersion: string;
  validUntil: string | null;
  reviewedBy: string | null;
  walletAddress: string;
  investorDisplayName: string;
  createdAt: string;
}

export default function VerifierEligibilityReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const currentVerifierId = "1521f5eb-844c-4f21-85b3-b258c0e19fe4"; // Seeded verifier 1
  const [record, setRecord] = useState<EligibilityRecord | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject" | "revoke">("approve");
  const [reason, setReason] = useState("");
  const [validUntilDate, setValidUntilDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    // Populate demo review item
    setRecord({
      id: id || "99999999-9999-9999-9999-999999999999",
      userId: "2a1b3a8b-8215-4111-9a76-7b3b6f51b109", // Demo Investor (different from verifier)
      offeringId: "33333333-3333-3333-3333-333333333333",
      status: "pending",
      chainStatus: "not_registered",
      policyVersion: "v1.0 (SEBI Category II AIF Equivalent Prototype)",
      validUntil: null,
      reviewedBy: null,
      walletAddress: "0x0000000000000000000000000000000000ace2c6",
      investorDisplayName: "Vikram Malhotra (Accredited Investor Demo)",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    });
  }, [id]);

  const isSelfReview = record?.userId === currentVerifierId;

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!record) return;

    if (!reason || reason.trim().length < 5) {
      setFeedback({ type: "error", message: "A substantive reason of at least 5 characters is strictly required." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/eligibility/${record.id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-user-id": currentVerifierId,
        },
        body: JSON.stringify({
          decision,
          reason,
          validUntil: decision === "approve" ? new Date(validUntilDate).toISOString() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to submit review decision");
      }

      setFeedback({
        type: "success",
        message: `Decision "${decision.toUpperCase()}" committed. Outbox job queued for Hedera chain mirroring.`,
      });

      setRecord((prev) => prev ? {
        ...prev,
        status: decision === "approve" ? "eligible" : decision === "reject" ? "ineligible" : "revoked",
        chainStatus: decision === "approve" ? "not_registered" : prev.chainStatus,
      } : null);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Review submission failed" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!record) {
    return (
      <AppShell initialRole="verifier">
        <PageContainer>
          <div className="p-8 text-center text-text-secondary">Loading eligibility record...</div>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell initialRole="verifier">
      <PageContainer>
        <div className="space-y-8 max-w-4xl mx-auto">
          <PageHeader
            title="Investor Accreditation Review"
            description="Evaluate investor identity attestation, bound wallet proof-of-control, and record decision."
            breadcrumbs={[
              { label: "Console", href: "/dashboard" },
              { label: "Verifier Queue", href: "/verifier" },
              { label: `Review ${record.id.slice(0, 8)}` },
            ]}
          />

          {/* Separation of Duties Banner (UI §8.4 requirement) */}
          {isSelfReview ? (
            <div className="p-4 rounded-lg bg-status-danger/10 border border-status-danger/30 text-status-danger flex items-start gap-3">
              <Lock className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-bold">Separation of Duties Violation</h3>
                <p className="text-xs mt-0.5">
                  You are the investor for this submission. Under ARCH §6.4, an applicant cannot evaluate or approve their own accreditation eligibility. Review actions are locked.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg bg-status-success/10 border border-status-success/20 text-status-success flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="font-semibold">Separation of Duties Verified</span>
                <span className="text-text-secondary">· Reviewer ID is distinct from applicant ID.</span>
              </div>
              <span className="font-mono text-2xs uppercase bg-surface-card px-2 py-0.5 rounded border border-status-success/30">
                Eligible to Review
              </span>
            </div>
          )}

          {/* Record Summary Card */}
          <div className="bg-surface-card border border-border rounded-lg p-6 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <span className="text-2xs font-mono uppercase text-text-secondary">
                  Applicant Identity
                </span>
                <h2 className="text-lg font-bold text-text-primary">
                  {record.investorDisplayName}
                </h2>
                <p className="text-xs font-mono text-text-secondary mt-0.5">
                  User ID: {record.userId}
                </p>
              </div>

              {/* Status pills: DB vs Chain shown separately */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono block text-text-secondary">
                    Database State
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-surface-muted border border-border text-text-primary uppercase">
                    {record.status}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono block text-text-secondary">
                    Hedera ATS State
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium border uppercase ${
                    record.chainStatus === "registered"
                      ? "bg-status-success/10 border-status-success/30 text-status-success"
                      : "bg-surface-muted border-border text-text-secondary"
                  }`}>
                    {record.chainStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Wallet & Request Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-surface-page border border-border rounded space-y-1">
                <span className="text-text-secondary font-medium">Bound EVM Wallet:</span>
                <HashValue
                  hash={record.walletAddress}
                  label="Bound Wallet Address"
                  shorten={true}
                />
              </div>

              <div className="p-3 bg-surface-page border border-border rounded space-y-1">
                <span className="text-text-secondary font-medium">Requested Offering:</span>
                <span className="font-mono text-text-primary block truncate">
                  {record.offeringId || "Global Accreditation (All Assets)"}
                </span>
              </div>

              <div className="p-3 bg-surface-page border border-border rounded space-y-1">
                <span className="text-text-secondary font-medium">Accreditation Policy:</span>
                <span className="font-mono text-text-primary block">
                  {record.policyVersion}
                </span>
              </div>

              <div className="p-3 bg-surface-page border border-border rounded space-y-1">
                <span className="text-text-secondary font-medium">Submission Timestamp:</span>
                <span className="font-mono text-text-primary block">
                  {new Date(record.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
                </span>
              </div>
            </div>
          </div>

          {/* Decision Form */}
          <form
            onSubmit={handleSubmitReview}
            className="bg-surface-card border border-border rounded-lg p-6 shadow-card space-y-6"
          >
            <div>
              <h3 className="text-base font-bold text-text-primary">
                Record Accreditation Decision
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                All decisions are committed to the immutable audit log and trigger on-chain ATS KYC registration.
              </p>
            </div>

            {/* Decision selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`p-3.5 rounded border cursor-pointer flex items-center gap-3 transition-colors ${
                  decision === "approve"
                    ? "bg-status-success/10 border-status-success/40 text-text-primary"
                    : "bg-surface-page border-border text-text-secondary hover:bg-surface-muted"
                }`}
              >
                <input
                  type="radio"
                  name="decision"
                  value="approve"
                  checked={decision === "approve"}
                  onChange={() => setDecision("approve")}
                  disabled={isSelfReview}
                  className="sr-only"
                />
                <CheckCircle2 className={`w-4 h-4 ${decision === "approve" ? "text-status-success" : "text-text-secondary"}`} />
                <span className="text-xs font-semibold">Approve Accreditation</span>
              </label>

              <label
                className={`p-3.5 rounded border cursor-pointer flex items-center gap-3 transition-colors ${
                  decision === "reject"
                    ? "bg-status-danger/10 border-status-danger/40 text-text-primary"
                    : "bg-surface-page border-border text-text-secondary hover:bg-surface-muted"
                }`}
              >
                <input
                  type="radio"
                  name="decision"
                  value="reject"
                  checked={decision === "reject"}
                  onChange={() => setDecision("reject")}
                  disabled={isSelfReview}
                  className="sr-only"
                />
                <XCircle className={`w-4 h-4 ${decision === "reject" ? "text-status-danger" : "text-text-secondary"}`} />
                <span className="text-xs font-semibold">Reject Request</span>
              </label>

              <label
                className={`p-3.5 rounded border cursor-pointer flex items-center gap-3 transition-colors ${
                  decision === "revoke"
                    ? "bg-status-warning/10 border-status-warning/40 text-text-primary"
                    : "bg-surface-page border-border text-text-secondary hover:bg-surface-muted"
                }`}
              >
                <input
                  type="radio"
                  name="decision"
                  value="revoke"
                  checked={decision === "revoke"}
                  onChange={() => setDecision("revoke")}
                  disabled={isSelfReview}
                  className="sr-only"
                />
                <RotateCcw className={`w-4 h-4 ${decision === "revoke" ? "text-status-warning" : "text-text-secondary"}`} />
                <span className="text-xs font-semibold">Revoke Accreditation</span>
              </label>
            </div>

            {/* Valid Until (for approve) */}
            {decision === "approve" && (
              <div className="space-y-1.5">
                <label htmlFor="validUntil" className="text-xs font-medium text-text-primary">
                  Accreditation Validity Window (Default: 1 Year)
                </label>
                <input
                  type="date"
                  id="validUntil"
                  value={validUntilDate}
                  onChange={(e) => setValidUntilDate(e.target.value)}
                  disabled={isSelfReview}
                  className="w-full text-xs font-mono bg-surface-page border border-border rounded px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-focus"
                />
              </div>
            )}

            {/* Required Reason Field */}
            <div className="space-y-1.5">
              <label htmlFor="reason" className="text-xs font-medium text-text-primary flex items-center justify-between">
                <span>Substantive Review Reason (Required)</span>
                <span className="text-2xs text-text-secondary">Minimum 5 characters</span>
              </label>
              <textarea
                id="reason"
                rows={3}
                placeholder="Cite regulatory criteria, net-worth certification documents, or compliance reasons..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSelfReview}
                className="w-full text-xs bg-surface-page border border-border rounded p-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-focus placeholder:text-text-secondary/50"
              />
            </div>

            {/* Feedback callout */}
            {feedback && (
              <div className={`p-3 rounded text-xs flex items-center gap-2 ${
                feedback.type === "success"
                  ? "bg-status-success/10 border border-status-success/20 text-status-success"
                  : "bg-status-danger/10 border border-status-danger/20 text-status-danger"
              }`}>
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-2xs text-text-secondary">
                * Decision will commit to PostgreSQL and enqueue a worker sync job to Hedera Testnet.
              </span>

              <Button
                type="submit"
                variant={decision === "approve" ? "primary" : decision === "reject" ? "destructive" : "secondary"}
                disabled={isSelfReview || isSubmitting}
                isLoading={isSubmitting}
              >
                <span>Commit Decision</span>
              </Button>
            </div>
          </form>
        </div>
      </PageContainer>
    </AppShell>
  );
}
