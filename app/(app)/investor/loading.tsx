import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageContainer } from '@/components/shell/PageContainer';

export default function InvestorLoading() {
  return (
    <PageContainer maxWidth="7xl">
      <div className="space-y-6 animate-pulse py-4" data-testid="investor-loading-state">
        <div className="border-b border-border pb-4 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>

        {/* 4 KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface-card border border-border rounded-lg p-4 space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
          ))}
        </div>

        {/* Table skeletons */}
        <div className="bg-surface-card border border-border rounded-lg p-5 space-y-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-32 rounded" />
        </div>
      </div>
    </PageContainer>
  );
}
