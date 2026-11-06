import React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export function LegalFooter() {
  return (
    <footer className="w-full bg-surface-card border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-bold tracking-tight text-brand-primary">
                NIVASA
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-surface-muted text-text-secondary border border-border">
                ETHTESTNET-2026
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed max-w-md">
              India-first real-world-asset lifecycle infrastructure prototype for ETHGlobal Mumbai.
              Architected on Hedera Testnet (Asset Tokenization Studio) and 0G Private Computer.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-3">
              Prototype Navigation
            </h4>
            <ul className="space-y-2 text-xs text-text-secondary">
              <li>
                <Link href="/" className="hover:text-text-primary transition-colors">
                  Overview & Lifecycle
                </Link>
              </li>
              <li>
                <Link href="/verify/offering/33333333-3333-3333-3333-333333333333" className="hover:text-text-primary transition-colors">
                  Public Verification
                </Link>
              </li>
              <li>
                <Link href="/offerings/33333333-3333-3333-3333-333333333333" className="hover:text-text-primary transition-colors">
                  Demo Offering
                </Link>
              </li>
              <li>
                <Link href="/investor" className="hover:text-text-primary transition-colors">
                  Investor Console
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-3">
              Verification Engine
            </h4>
            <ul className="space-y-2 text-xs text-text-secondary">
              <li>
                <span className="text-text-secondary font-mono">Hedera Testnet (Chain 296)</span>
              </li>
              <li>
                <span className="text-text-secondary font-mono">ATS Diamond 0.0.11330441</span>
              </li>
              <li>
                <span className="text-text-secondary font-mono">0G Private Computer AI</span>
              </li>
              <li>
                <span className="text-text-secondary font-mono">PostgreSQL SHA-256 Chain</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Mandatory Legal & Prototype Limitation Footer per UI §6.4 */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-text-secondary/90 leading-relaxed max-w-3xl">
            Technical prototype only. This page does not establish title, legal validity, regulatory authorization, or investment suitability. DELTA references are inspired by a proposed framework and do not mean NIVASA is compliant with or approved under it.
          </p>
          <div className="flex items-center gap-1.5 shrink-0 text-xs text-text-secondary font-mono">
            <ShieldCheck className="w-4 h-4 text-brand-primary" aria-hidden="true" />
            <span>ETHGlobal Mumbai 2026</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
