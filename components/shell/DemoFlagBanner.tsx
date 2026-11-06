import React from 'react';
import { AlertCircle, Sliders } from 'lucide-react';

export interface DemoFlagBannerProps {
  paymentsEnabled?: boolean;
  faultsEnabled?: boolean;
  eventsEnabled?: boolean;
}

export function DemoFlagBanner({
  paymentsEnabled = false,
  faultsEnabled = false,
  eventsEnabled = false,
}: DemoFlagBannerProps) {
  const activeFlags: string[] = [];

  if (paymentsEnabled) activeFlags.push('SIMULATED PAYMENT ENABLED');
  if (faultsEnabled) activeFlags.push('FAULT INJECTION ENABLED (DEMO)');
  if (eventsEnabled) activeFlags.push('SCRIPTED PROPERTY EVENTS ENABLED (DEMO)');

  if (activeFlags.length === 0) return null;

  return (
    <aside
      aria-label="Active demo configuration flags"
      className="w-full bg-status-info/10 border-b border-status-info/20 px-4 py-1.5 text-xs text-status-info flex items-center justify-center gap-3"
    >
      <Sliders className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <div className="flex flex-wrap items-center justify-center gap-3 font-mono font-medium">
        {activeFlags.map((flag) => (
          <span key={flag} className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-status-info" aria-hidden="true" />
            {flag}
          </span>
        ))}
      </div>
    </aside>
  );
}
