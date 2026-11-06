'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface Props {
  propertyId: string;
  initialPreferences: {
    yield_preference: 'modest' | 'balanced' | 'growth';
    risk_tolerance: 'conservative' | 'moderate' | 'aggressive';
    liquidity_horizon: 'short' | 'medium' | 'long';
  };
}

export function IntelligenceControls({ propertyId, initialPreferences }: Props) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [isUpdating, setIsUpdating] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveAndRerun = async () => {
    setIsUpdating(true);
    setSavedSuccess(false);
    try {
      // 1. Save profile
      await fetch('/api/ai/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      // 2. Refresh analysis
      await fetch('/api/ai/analyze-offering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, snapshotFrom: 1, snapshotTo: 2, preferences }),
      });

      setSavedSuccess(true);
      // Reload page to reflect fresh analysis outcome
      window.location.reload();
    } catch {
      // Handle error gracefully
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">
            Investor Preference Buckets
          </h4>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Bucketed preferences only. No personal identifiers are stored or passed to the 0G Private Computer.
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleSaveAndRerun}
          isLoading={isUpdating}
        >
          {savedSuccess ? 'Preferences Saved' : 'Apply & Re-evaluate'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="font-medium text-[var(--text-secondary)] block mb-1">
            Yield Preference
          </label>
          <select
            className="w-full p-2 rounded border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--focus)] outline-none"
            value={preferences.yield_preference}
            onChange={(e) =>
              setPreferences({
                ...preferences,
                yield_preference: e.target.value as 'modest' | 'balanced' | 'growth',
              })
            }
          >
            <option value="modest">Modest (Lower target yield)</option>
            <option value="balanced">Balanced (Moderate yield)</option>
            <option value="growth">Growth (Higher target yield)</option>
          </select>
        </div>

        <div>
          <label className="font-medium text-[var(--text-secondary)] block mb-1">
            Risk Tolerance
          </label>
          <select
            className="w-full p-2 rounded border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--focus)] outline-none"
            value={preferences.risk_tolerance}
            onChange={(e) =>
              setPreferences({
                ...preferences,
                risk_tolerance: e.target.value as 'conservative' | 'moderate' | 'aggressive',
              })
            }
          >
            <option value="conservative">Conservative</option>
            <option value="moderate">Moderate</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </div>

        <div>
          <label className="font-medium text-[var(--text-secondary)] block mb-1">
            Liquidity Horizon
          </label>
          <select
            className="w-full p-2 rounded border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--focus)] outline-none"
            value={preferences.liquidity_horizon}
            onChange={(e) =>
              setPreferences({
                ...preferences,
                liquidity_horizon: e.target.value as 'short' | 'medium' | 'long',
              })
            }
          >
            <option value="short">Short (&lt; 1 yr)</option>
            <option value="medium">Medium (1 - 3 yrs)</option>
            <option value="long">Long (&gt; 3 yrs)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

