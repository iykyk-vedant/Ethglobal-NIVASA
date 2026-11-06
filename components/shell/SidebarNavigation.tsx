'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { UserRole } from '@/lib/auth/roles';
import {
  LayoutDashboard,
  Building2,
  FileCheck2,
  ScrollText,
  Coins,
  ClipboardList,
  ShieldAlert,
  History,
  Wallet,
  Receipt,
  Sparkles,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface SidebarNavigationProps {
  role?: UserRole | 'public';
  className?: string;
}

export function SidebarNavigation({
  role = 'investor',
  className = '',
}: SidebarNavigationProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const navItemsByRole: Record<string, NavItem[]> = {
    issuer: [
      { label: 'Overview', href: '/issuer', icon: LayoutDashboard },
      { label: 'New Property', href: '/issuer/new', icon: Building2 },
      { label: 'Offerings & Tokens', href: '/issuer#offerings', icon: Coins },
    ],
    verifier: [
      { label: 'Review Queue', href: '/verifier', icon: ClipboardList },
      { label: 'Property Reviews', href: '/verifier/reviews', icon: Building2 },
      { label: 'Eligibility Reviews', href: '/verifier/eligibility', icon: ShieldCheck },
      { label: 'Decision History', href: '/verifier/history', icon: History },
    ],
    investor: [
      { label: 'Overview', href: '/investor', icon: LayoutDashboard },
      { label: 'Demo Offering', href: '/offerings/33333333-3333-3333-3333-333333333333', icon: Coins },
      { label: 'Wallet & Eligibility', href: '/investor/wallet', icon: Wallet },
      { label: 'Orders & Holdings', href: '/investor/orders', icon: Receipt },
      { label: 'Property Intelligence', href: '/intelligence/11111111-1111-1111-1111-111111111111', icon: Sparkles },
    ],
    admin: [
      { label: 'Operations', href: '/admin/ops', icon: LayoutDashboard },
      { label: 'Offerings', href: '/admin/offerings', icon: Coins },
      { label: 'Orders & Reconcile', href: '/admin/orders', icon: Receipt },
      { label: 'Audit Log Chain', href: '/admin/audit', icon: History },
      { label: 'Demo Controls', href: '/admin/demo', icon: Sliders },
    ],
    public: [
      { label: 'Overview', href: '/', icon: LayoutDashboard },
      { label: 'Public Verify', href: '/verify/offering/33333333-3333-3333-3333-333333333333', icon: ShieldCheck },
      { label: 'Demo Offering', href: '/offerings/33333333-3333-3333-3333-333333333333', icon: Coins },
    ],
  };

  const navItems = navItemsByRole[role] || navItemsByRole.investor;

  return (
    <aside
      aria-label="Sidebar Navigation"
      className={`hidden md:flex flex-col border-r border-border bg-surface-card transition-all duration-normal shrink-0 ${
        collapsed ? 'w-[72px]' : 'w-64'
      } ${className}`}
    >
      <div className="h-14 flex items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <Link href="/" className="flex items-center">
            <Image
              src="/nivasa-wordmark.png"
              alt="NIVASA"
              width={1024}
              height={341}
              className="h-7 w-auto object-contain mix-blend-multiply"
            />
          </Link>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar navigation' : 'Collapse sidebar navigation'}
          className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ml-auto"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-brand-primary text-surface-card shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border text-[11px] text-text-secondary">
        {!collapsed && (
          <div className="space-y-1">
            <span className="block font-semibold text-text-primary uppercase tracking-wider text-[10px]">
              Active Persona
            </span>
            <span className="capitalize">{role} Mode</span>
          </div>
        )}
      </div>
    </aside>
  );
}
