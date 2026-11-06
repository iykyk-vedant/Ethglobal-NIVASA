'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/shell/AppShell';
import { PageContainer } from '@/components/shell/PageContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatINR } from '@/lib/money/decimal';
import { Coins, ExternalLink, ShieldCheck, ArrowRight, RefreshCw, Sparkles, Building2 } from 'lucide-react';

export default function AdminOfferingsListPage() {
  const [offerings, setOfferings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const DEMO_ADMIN_ID = 'f3509049-11fb-4ab4-993b-050c7878d1d3';

  const fetchOfferings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/offerings', {
        headers: { 'x-demo-user-id': DEMO_ADMIN_ID },
      });
      if (res.ok) {
        const json = await res.json();
        setOfferings(json.offerings || []);
      }
    } catch (err) {
      console.error('Failed to load offerings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfferings();
  }, []);

  return (
    <AppShell initialRole="admin">
      <PageContainer>
        <div className="space-y-6">
          <PageHeader
            title="Offerings & Asset Administration"
            description="Manage tokenized asset offerings, on-chain ATS contracts, and issuance caps."
            breadcrumbs={[
              { label: 'Admin', href: '/admin/ops' },
              { label: 'Offerings' },
            ]}
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)]">
              Showing {offerings.length} tokenized asset offerings
            </span>
            <Button
              variant="outline"
              onClick={fetchOfferings}
              disabled={loading}
              className="text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              <span>Refresh</span>
            </Button>
          </div>

          <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[var(--surface-sunken)] border-b border-[var(--border-subtle)] text-[var(--text-secondary)] font-medium">
                  <tr>
                    <th className="py-3 px-4">Offering / Token</th>
                    <th className="py-3 px-4">Property</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">ATS Contract ID</th>
                    <th className="py-3 px-4">Total Supply Cap</th>
                    <th className="py-3 px-4">Unit Price</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[var(--text-secondary)] italic">
                        Loading offerings...
                      </td>
                    </tr>
                  ) : offerings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[var(--text-secondary)] italic">
                        No offerings found.
                      </td>
                    </tr>
                  ) : (
                    offerings.map((offering) => (
                      <tr key={offering.id} className="hover:bg-[var(--surface-sunken)] transition-colors">
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-[var(--text-primary)] block">
                              {offering.token_name || 'Offering'}
                            </span>
                            <span className="font-mono text-[11px] text-[var(--text-secondary)]">
                              {offering.token_symbol || 'TOKEN'} · {offering.id.slice(0, 8)}...
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <span className="font-medium text-[var(--text-primary)] block truncate max-w-[160px]">
                              {offering.properties?.name || offering.property_id.slice(0, 8)}
                            </span>
                            <span className="text-[11px] text-[var(--text-secondary)]">
                              {offering.properties?.city || 'Bengaluru'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              offering.status === 'active'
                                ? 'success'
                                : offering.status === 'paused_evidence_drift'
                                ? 'warning'
                                : offering.status === 'pending_approval'
                                ? 'warning'
                                : 'neutral'
                            }
                            className="font-mono text-[10px]"
                          >
                            {offering.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-mono text-[var(--text-primary)] text-[11px]">
                          {(offering.ats_asset_ref || offering.token_contract_id) ? (
                            <a
                              href={`https://hashscan.io/testnet/contract/${offering.ats_asset_ref || offering.token_contract_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1"
                            >
                              <span>{offering.ats_asset_ref || offering.token_contract_id}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-[var(--text-secondary)] italic">Not Deployed</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-[var(--text-primary)]">
                          {offering.total_units} units
                        </td>
                        <td className="py-3 px-4 font-mono text-[var(--text-primary)]">
                          {formatINR(offering.unit_price_inr || '0')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/offerings/${offering.id}`}
                              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1"
                              title="Public Offering View"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                            <Link
                              href={`/verify/offering/${offering.id}`}
                              className="inline-flex items-center gap-1 text-[var(--brand-primary)] hover:underline font-semibold"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Verify</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
