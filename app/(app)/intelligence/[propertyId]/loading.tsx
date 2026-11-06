import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-pulse">
      <div className="h-4 w-48 bg-[var(--surface-muted)] rounded" />
      <div className="space-y-3">
        <div className="h-8 w-64 bg-[var(--surface-muted)] rounded" />
        <div className="h-4 w-96 bg-[var(--surface-muted)] rounded" />
      </div>
      <div className="h-10 bg-[var(--surface-muted)] rounded" />
      <div className="h-64 bg-[var(--surface-muted)] rounded-xl" />
      <div className="h-96 bg-[var(--surface-muted)] rounded-xl" />
    </div>
  );
}

