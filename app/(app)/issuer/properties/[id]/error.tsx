'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
      <div className="inline-flex p-3 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-[var(--text-primary)]">
        Failed to load property workspace
      </h2>
      <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
        {error.message || 'An unexpected error occurred while loading the property documents and evidence manifest.'}
      </p>
      <div className="pt-2">
        <Button onClick={() => reset()} size="sm">
          Try Again
        </Button>
      </div>
    </div>
  );
}
