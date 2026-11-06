'use client';

import React, { useState } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

export function PrototypeBanner() {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      <aside
        aria-label="Prototype simulation notice"
        role="region"
        className="w-full bg-status-warning/10 border-b border-status-warning/25 px-4 py-2 text-xs md:text-sm text-status-warning flex items-center justify-between sm:justify-center gap-2 sticky top-0 z-50 backdrop-blur-md"
      >
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 shrink-0 text-status-warning" aria-hidden="true" />
          <span className="font-semibold tracking-wide uppercase truncate">
            SIMULATED DEMO · NOT A REAL OFFERING
          </span>
          <span className="hidden md:inline text-text-secondary text-xs">
            — Maharashtra commercial asset prototype. No investment or ownership claims.
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowInfo(!showInfo)}
          aria-expanded={showInfo}
          aria-controls="simulation-banner-info"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-status-warning hover:bg-status-warning/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ml-2 shrink-0"
        >
          <Info className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Details</span>
        </button>
      </aside>

      {/* Popover explaining exact prototype boundaries per UI §6.1 */}
      {showInfo && (
        <div
          id="simulation-banner-info"
          role="dialog"
          aria-label="Prototype scope explanation"
          className="fixed top-11 right-4 z-50 max-w-md p-4 bg-surface-card rounded-md border border-border shadow-popover text-xs text-text-primary space-y-2 animate-in fade-in duration-fast"
        >
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="font-semibold text-text-primary">Prototype Boundaries</span>
            <button
              type="button"
              onClick={() => setShowInfo(false)}
              aria-label="Close prototype details"
              className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
          <p className="leading-relaxed text-text-secondary">
            NIVASA is a technical prototype using one fictional Maharashtra commercial property and simulated figures. It does not offer real investments, establish property ownership, or imply government approval.
          </p>
          <p className="text-[11px] text-text-secondary/80 border-t border-border/50 pt-2">
            Built for ETHGlobal Mumbai (Nov 2026). All on-chain records exist strictly on the Hedera Testnet.
          </p>
        </div>
      )}
    </>
  );
}
