import React from 'react';

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-6 animate-pulse">
      <div className="h-4 w-48 bg-[var(--surface-muted)] rounded" />
      <div className="h-10 w-96 bg-[var(--surface-muted)] rounded" />
      <div className="h-32 w-full bg-[var(--surface-muted)] rounded-xl" />
      <div className="h-64 w-full bg-[var(--surface-muted)] rounded-xl" />
    </div>
  );
}
