import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageContainer } from '@/components/shell/PageContainer';

export default function OfferingLoading() {
  return (
    <PageContainer maxWidth="7xl">
      <div className="space-y-6 animate-pulse py-4" data-testid="offering-loading-state">
        <div className="border-b border-border pb-4 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-96" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface-card border border-border rounded-lg p-5 space-y-4">
              <Skeleton className="h-6 w-56" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20 rounded" />
                ))}
              </div>
            </div>
            <div className="bg-surface-card border border-border rounded-lg p-5 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-24 rounded" />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-surface-card border border-border rounded-lg p-5 space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-32 rounded" />
            </div>
            <div className="bg-surface-card border border-border rounded-lg p-5 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-48 rounded" />
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
