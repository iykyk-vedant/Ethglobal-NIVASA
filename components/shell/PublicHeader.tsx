import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export function PublicHeader() {
  return (
    <header className="w-full bg-surface-card border-b border-border sticky top-[37px] z-40 backdrop-blur-md">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="font-serif text-2xl font-bold tracking-tight text-brand-primary group-hover:text-brand-secondary transition-colors">
              NIVASA
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-surface-muted text-text-secondary border border-border">
              PROTOTYPE
            </span>
          </Link>

          <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-6 text-xs font-medium text-text-secondary">
            <Link href="#lifecycle" className="hover:text-brand-primary transition-colors">
              How it works
            </Link>
            <Link href="/verify/offering/33333333-3333-3333-3333-333333333333" className="hover:text-brand-primary transition-colors">
              Public Verify
            </Link>
            <Link href="#limits" className="hover:text-brand-primary transition-colors">
              Prototype limits
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/verify/offering/33333333-3333-3333-3333-333333333333"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-primary hover:bg-surface-muted rounded transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-brand-primary" aria-hidden="true" />
            <span>Verify Live Ledger</span>
          </Link>

          <Link
            href="/offerings/33333333-3333-3333-3333-333333333333"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-brand-primary text-surface-card rounded hover:bg-brand-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <span>Explore Demo</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
