'use client';

import React from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/shell/PageContainer';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function OfferingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const correlationId = error.digest || `err-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <PageContainer maxWidth="xl" className="py-12">
      <div
        className="p-8 rounded-lg bg-surface-card border border-status-danger/40 text-center space-y-4 shadow-sm"
        data-testid="offering-error-boundary"
      >
        <AlertTriangle className="w-10 h-10 text-status-danger mx-auto" />
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-text-primary">
            Offering temporarily unavailable
          </h1>
          <p className="text-xs text-text-secondary max-w-md mx-auto">
            The server could not load this offering. Check the deployment function logs using this correlation ID. Confirm the production database configuration and offering record; chain read outages are shown as unavailable when the page can otherwise load.
          </p>
        </div>

        <div className="p-3 bg-surface-muted rounded border border-border inline-block text-[11px] font-mono text-text-secondary">
          Correlation ID: <span className="text-text-primary font-semibold">{correlationId}</span>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="primary" onClick={() => reset()} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Try Again</span>
          </Button>
          <Link href="/">
            <Button variant="outline" className="text-xs">
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
