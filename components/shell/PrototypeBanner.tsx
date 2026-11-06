import React from "react";
import { AlertTriangle } from "lucide-react";

export function PrototypeBanner() {
  return (
    <aside
      aria-label="Simulation notice"
      className="w-full bg-status-warning/10 border-b border-status-warning/20 px-4 py-2 text-xs md:text-sm text-status-warning flex items-center justify-center gap-2 sticky top-0 z-50 shadow-sm"
    >
      <AlertTriangle className="w-4 h-4 text-status-warning shrink-0" aria-hidden="true" />
      <span className="font-semibold tracking-wide uppercase">
        SIMULATED DEMO · NOT A REAL OFFERING
      </span>
      <span className="hidden sm:inline text-text-secondary text-xs">
        — Technical prototype with fictional property & simulated records. No investment, ownership, or regulatory claims.
      </span>
    </aside>
  );
}

