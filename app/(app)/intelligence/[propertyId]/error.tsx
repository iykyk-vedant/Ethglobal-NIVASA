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
    <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
      <div className="text-3xl">⚠️</div>
      <h2 className="text-lg font-bold text-[var(--text-primary)]">
        Property Intelligence Unavailable
      </h2>
      <p className="text-sm text-[var(--text-secondary)]">
        {error.message || 'An unexpected error occurred while loading property intelligence.'}
      </p>
      <div className="pt-2">
        <Button onClick={() => reset()} size="sm">
          Try Again
        </Button>
      </div>
    </div>
  );
}

