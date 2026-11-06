'use client';

import React, { useState, useId } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SignedAcknowledgementPanel } from './SignedAcknowledgementPanel';
import {
  buildInvestmentAcknowledgementMessage,
  CANONICAL_SIMULATED_DEMO_STATEMENT,
} from '@/lib/wallet/investment-acknowledgement';
import { multiplyMoney, formatINR } from '@/lib/money/decimal';

export interface DemoOrderFormProps {
  offeringId: string;
  offeringStatus?: string;
  rightsVersion: number;
  rightsDocumentHash: string;
  unitPriceInr: string;
  minimumUnits: number;
  maximumUnitsPerInvestor: number;
  remainingSupply: number;
  boundWalletAddress?: string | null;
  isEligible: boolean;
  className?: string;
}

export function DemoOrderForm({
  offeringId,
  offeringStatus = 'active',
  rightsVersion,
  rightsDocumentHash,
  unitPriceInr,
  minimumUnits,
  maximumUnitsPerInvestor,
  remainingSupply,
  boundWalletAddress,
  isEligible,
  className = '',
}: DemoOrderFormProps) {
  const router = useRouter();
  const formId = useId();

  const isDriftPaused = offeringStatus === 'paused_evidence_drift';
  const isPaused = offeringStatus === 'paused' || isDriftPaused;

  const [units, setUnits] = useState<string>(minimumUnits.toString());
  const [signature, setSignature] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Exact decimal multiplication — never pass money through Number()
  const totalAmountInr = multiplyMoney(unitPriceInr, units || '0');

  // Stable nonce and 15-minute expiration timestamp for acknowledgement
  const [nonce] = useState<string>(() => ethers.hexlify(ethers.randomBytes(16)));
  const [expiresAt] = useState<string>(() =>
    new Date(Date.now() + 15 * 60 * 1000).toISOString()
  );

  const numUnits = parseInt(units || '0', 10);
  const isUnitsValid =
    !isNaN(numUnits) &&
    numUnits >= minimumUnits &&
    numUnits <= maximumUnitsPerInvestor &&
    numUnits <= remainingSupply;

  const wallet = boundWalletAddress || '0x0000000000000000000000000000000000000000';

  const rawAcknowledgement = buildInvestmentAcknowledgementMessage({
    offeringId,
    rightsVersion,
    rightsDocumentHash,
    units: units || '0',
    unitPriceInr,
    totalAmountInr,
    walletAddress: wallet,
    nonce,
    expiresAt,
    statement: CANONICAL_SIMULATED_DEMO_STATEMENT,
  });

  const handleUnitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPaused) return;
    const val = e.target.value.replace(/\D/g, '');
    setUnits(val);
    setSignature(null); // Reset signature if terms change
    setErrorMessage(null);
  };

  const handleSign = async () => {
    if (isPaused) {
      setErrorMessage('OFFERING_PAUSED_EVIDENCE: Cannot sign order terms while offering is paused.');
      return;
    }
    if (!isUnitsValid) {
      setErrorMessage(`Please enter a valid unit count between ${minimumUnits} and ${maximumUnitsPerInvestor}.`);
      return;
    }
    if (!boundWalletAddress) {
      setErrorMessage('Please connect and verify your demo wallet first before signing.');
      return;
    }

    setIsSigning(true);
    setErrorMessage(null);

    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();

        if (address.toLowerCase() !== boundWalletAddress.toLowerCase()) {
          throw new Error(
            `Connected browser wallet (${address}) does not match your bound wallet (${boundWalletAddress}).`
          );
        }

        const sig = await signer.signMessage(rawAcknowledgement);
        setSignature(sig);
      } else {
        // Fallback for automated testing / headless simulated wallet
        setSignature(`0xsimulated_signature_${Date.now()}`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Signing failed. Please try again.');
    } finally {
      setIsSigning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPaused) {
      setErrorMessage('OFFERING_PAUSED_EVIDENCE: Cannot create order while offering is paused.');
      return;
    }
    if (!signature) {
      setErrorMessage('Please cryptographically sign the acknowledgement statement first.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const idempotencyKey = `order:${offeringId}:${wallet}:${nonce}`;

      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          offeringId,
          units: parseInt(units, 10),
          acknowledgement: {
            offeringId,
            rightsVersion,
            rightsDocumentHash,
            units,
            unitPriceInr,
            totalAmountInr,
            walletAddress: boundWalletAddress,
            nonce,
            expiresAt,
            statement: CANONICAL_SIMULATED_DEMO_STATEMENT,
            signature,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to create simulated order.');
      }

      router.push(`/investor/orders/${data.orderId}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`border border-[var(--border-subtle)] rounded-lg p-5 bg-[var(--surface-primary)] shadow-sm space-y-4 ${className}`}
      data-testid="demo-order-form"
    >
      <div className="border-b border-[var(--border-subtle)] pb-3">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          Create Simulated Order
        </h3>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Simulated order reservation on Hedera Testnet. No real fiat money or title transfer.
        </p>
      </div>

      {isDriftPaused && (
        <div
          role="alert"
          className="p-3 text-xs bg-[var(--surface-sunken)] border border-[var(--status-danger)] text-[var(--status-danger)] rounded space-y-1"
          data-testid="order-paused-evidence-alert"
        >
          <div className="font-semibold flex items-center gap-1.5">
            <span aria-hidden="true">⚠️</span>
            <span>OFFERING_PAUSED_EVIDENCE: Order creation is disabled</span>
          </div>
          <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
            Issuance is currently paused because the underlying property evidence package was modified.
            New unit reservations are refused until an independent verifier re-reviews and approves the updated evidence manifest.
          </p>
        </div>
      )}

      {errorMessage && !isDriftPaused && (
        <div
          role="alert"
          className="p-3 text-xs bg-[var(--surface-sunken)] border border-[var(--status-danger)] text-[var(--status-danger)] rounded flex items-start gap-2"
        >
          <span aria-hidden="true">⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Units Selection and Price Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={`${formId}-units`}
            className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
          >
            Number of Units (Min: {minimumUnits}, Max: {maximumUnitsPerInvestor})
          </label>
          <Input
            id={`${formId}-units`}
            type="text"
            inputMode="numeric"
            value={units}
            onChange={handleUnitsChange}
            disabled={isPaused || !isEligible || isSubmitting}
            className="font-mono text-sm"
            data-testid="order-units-input"
          />
          <div className="text-[11px] text-[var(--text-secondary)] mt-1">
            Available supply: <span className="font-semibold">{remainingSupply} units</span>
          </div>
        </div>

        <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded flex flex-col justify-center">
          <span className="text-xs text-[var(--text-secondary)]">Calculated Total (INR):</span>
          <span className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
            {formatINR(totalAmountInr)}
          </span>
          <span className="text-[11px] text-[var(--text-secondary)] font-mono">
            {units || 0} × ₹{unitPriceInr}
          </span>
        </div>
      </div>

      {/* Signed Acknowledgement Panel */}
      <SignedAcknowledgementPanel
        offeringId={offeringId}
        rightsVersion={rightsVersion}
        rightsDocumentHash={rightsDocumentHash}
        units={units}
        unitPriceInr={unitPriceInr}
        totalAmountInr={totalAmountInr}
        walletAddress={wallet}
        nonce={nonce}
        expiresAt={expiresAt}
        statement={CANONICAL_SIMULATED_DEMO_STATEMENT}
        rawMessage={rawAcknowledgement}
        signature={signature || undefined}
        isSigning={isSigning}
        onSign={handleSign}
        disabled={isPaused}
      />

      {/* Order submission action */}
      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          disabled={isPaused || !isEligible || !signature || isSubmitting}
          isLoading={isSubmitting}
          className="w-full font-semibold"
          data-testid="submit-simulated-order-button"
        >
          {isDriftPaused ? 'Issuance Paused (OFFERING_PAUSED_EVIDENCE)' : 'Create Simulated Order (Reserve Units)'}
        </Button>
        <p className="text-[11px] text-center text-[var(--text-secondary)] mt-1.5">
          Order reservation holds units for 15 minutes pending simulated payment confirmation.
        </p>
      </div>
    </form>
  );
}
