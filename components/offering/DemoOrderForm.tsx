'use client';

import React, { useState, useId } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { mulMoney, formatINR } from '@/lib/money/decimal';
import {
  buildInvestmentAcknowledgementMessage,
  CANONICAL_SIMULATED_DEMO_STATEMENT,
} from '@/lib/wallet/investment-acknowledgement';
import { SignedAcknowledgementPanel } from './SignedAcknowledgementPanel';

export interface DemoOrderFormProps {
  offeringId: string;
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

  const [units, setUnits] = useState<string>(minimumUnits.toString());
  const [nonce, setNonce] = useState<string>(() => `order_nonce_${Date.now()}`);
  const [expiresAt, setExpiresAt] = useState<string>(() => new Date(Date.now() + 900000).toISOString());
  const [signature, setSignature] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Exact decimal multiplication — never pass money through Number()
  const validUnitsInt = /^[1-9]\d*$/.test(units) ? parseInt(units, 10) : 0;
  const isUnitsValid = validUnitsInt >= minimumUnits && validUnitsInt <= maximumUnitsPerInvestor && validUnitsInt <= remainingSupply;

  const totalAmountInr = isUnitsValid
    ? mulMoney(unitPriceInr, units)
    : '0.00';

  const wallet = boundWalletAddress || '0x0000000000000000000000000000000000000000';

  // Deterministic message format matching server
  const rawAcknowledgement = buildInvestmentAcknowledgementMessage({
    offeringId,
    rightsVersion,
    rightsDocumentHash,
    units: units || '1',
    unitPriceInr,
    totalAmountInr,
    walletAddress: wallet,
    nonce,
    expiresAt,
    statement: CANONICAL_SIMULATED_DEMO_STATEMENT,
  });

  const handleUnitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setUnits(val);
    setSignature(null); // Reset signature if terms change!
    setErrorMessage(null);
  };

  const handleSign = async () => {
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
      // 1. Check if browser wallet (MetaMask / Rabby) is present
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
        // Fallback for automated or non-injected browser test sessions
        // Calls the test wallet endpoint or creates deterministic dev signature
        const fallbackWallet = ethers.Wallet.createRandom();
        // Prompt user to connect wallet or simulate demo signature
        setErrorMessage(
          'No browser Web3 wallet detected. Please install MetaMask/Rabby or connect via /investor/wallet.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign order acknowledgement.');
    } finally {
      setIsSigning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signature) {
      setErrorMessage('Please sign the acknowledgement message first.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const idempotencyKey = `idemp_order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          offeringId,
          units: validUnitsInt,
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
        throw new Error(data.error?.message || 'Failed to create simulated order.');
      }

      // Route to order details with settlement timeline
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

      {errorMessage && (
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
            disabled={!isEligible || isSubmitting}
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
      />

      {/* Submit Button (Never says Invest or Buy now) */}
      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          disabled={!isEligible || !signature || isSubmitting}
          isLoading={isSubmitting}
          className="w-full font-semibold"
          data-testid="submit-simulated-order-button"
        >
          Create Simulated Order (Reserve Units)
        </Button>
        <p className="text-[11px] text-center text-[var(--text-secondary)] mt-1.5">
          Order reservation holds units for 15 minutes pending simulated payment confirmation.
        </p>
      </div>
    </form>
  );
}
