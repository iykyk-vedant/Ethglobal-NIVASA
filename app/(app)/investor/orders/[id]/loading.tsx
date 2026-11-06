import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageContainer } from '@/components/shell/PageContainer';

export default function OrderLoading() {
  return (
    <PageContainer maxWidth="xl">
      <div className="space-y-6 animate-pulse py-8" data-testid="order-loading-state">
        <div className="border-b border-border pb-4 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="bg-surface-card border border-border rounded-lg p-5 space-y-4">
          <Skeleton className="h-5 w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 rounded" />
            ))}
          </div>
        </div>

        <div className="bg-surface-card border border-border rounded-lg p-5 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-40 rounded" />
        </div>
      </div>
    </PageContainer>
  );
}
