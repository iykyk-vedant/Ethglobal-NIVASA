'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/shell/AppShell';
import { PageContainer } from '@/components/shell/PageContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatINR } from '@/lib/money/decimal';
import { Receipt, ArrowRight, RefreshCw, Sliders, ShieldCheck } from 'lucide-react';

export default function AdminOrdersListPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const DEMO_ADMIN_ID = 'f3509049-11fb-4ab4-993b-050c7878d1d3';

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/investments?limit=25', {
        headers: { 'x-demo-user-id': DEMO_ADMIN_ID },
      });
      if (res.ok) {
        const json = await res.json();
        setOrders(json.orders || []);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <AppShell initialRole="admin">
      <PageContainer>
        <div className="space-y-6">
          <PageHeader
            title="Investment Orders & Settlement Reconciliation"
            description="Inspect on-chain allocation attempts, consensus transaction IDs, and reconciliation assertions."
            breadcrumbs={[
              { label: 'Admin', href: '/admin/ops' },
              { label: 'Orders & Reconcile' },
            ]}
          />

          <div className="flex items-center justify-between">
            <Link
              href="/admin/demo"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--brand-primary)] hover:underline font-semibold"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Open Settlement Fault Injector Controls →</span>
            </Link>

            <Button
              variant="outline"
              onClick={fetchOrders}
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
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Units</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Created At</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[var(--text-secondary)] italic">
                        Loading orders...
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[var(--text-secondary)] italic">
                        No investment orders found.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} className="hover:bg-[var(--surface-sunken)] transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-[var(--text-primary)]">
                          {order.id.slice(0, 8)}...
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              order.status === 'COMPLETED'
                                ? 'success'
                                : order.status === 'RECONCILIATION_REQUIRED' || order.status === 'MANUAL_REVIEW'
                                ? 'danger'
                                : 'warning'
                            }
                            className="font-mono text-[10px]"
                          >
                            {order.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-[var(--text-primary)]">
                          {order.units}
                        </td>
                        <td className="py-3 px-4 font-mono text-[var(--text-primary)]">
                          {formatINR(order.amount_inr || '0')}
                        </td>
                        <td className="py-3 px-4 font-mono text-[var(--text-secondary)]">
                          {new Date(order.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="inline-flex items-center gap-1 text-[var(--brand-primary)] hover:underline font-semibold"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
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
