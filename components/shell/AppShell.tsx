"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarNavigation } from "./SidebarNavigation";
import { MobileBottomNavigation } from "./MobileBottomNavigation";
import { RoleLabel } from "./RoleLabel";
import { DemoFlagBanner } from "./DemoFlagBanner";
import { LegalFooter } from "./LegalFooter";
import { UserRole } from "@/lib/auth/roles";
import { Menu, X } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  initialRole?: UserRole | "public";
  demoFlags?: {
    paymentsEnabled?: boolean;
    faultsEnabled?: boolean;
    eventsEnabled?: boolean;
  };
}

export function AppShell({
  children,
  initialRole = "investor",
  demoFlags = {
    paymentsEnabled: true,
  },
}: AppShellProps) {
  const pathname = usePathname();
  const [selectedRole, setSelectedRole] = useState<UserRole | "public">(() => {
    if (pathname?.startsWith("/issuer")) return "issuer";
    if (pathname?.startsWith("/verifier")) return "verifier";
    if (pathname?.startsWith("/admin")) return "admin";
    if (pathname?.startsWith("/investor")) return "investor";
    return initialRole;
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-surface-page text-text-primary">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-20 h-14 bg-surface-card border-b border-border shadow-card flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-focus"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-serif font-bold text-xl tracking-tight text-brand-primary">
              NIVASA
            </span>
            <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider font-mono text-text-secondary bg-surface-muted px-1.5 py-0.5 rounded border border-border">
              Console
            </span>
          </Link>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Hedera Chain Status Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-status-success/10 border border-status-success/20 text-xs font-mono text-status-success">
            <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
            <span>Hedera Testnet (296)</span>
          </div>

          {/* Role switcher for demo workflow */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary hidden sm:inline">Role:</span>
            <div className="relative inline-block">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole | "public")}
                aria-label="Demo role selector"
                className="text-xs font-medium bg-surface-muted border border-border rounded-md px-2.5 py-1.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-focus cursor-pointer"
              >
                <option value="investor">Investor View</option>
                <option value="issuer">Issuer View</option>
                <option value="verifier">Verifier View</option>
                <option value="admin">Admin / Ops View</option>
              </select>
            </div>
            <RoleLabel role={selectedRole} />
          </div>
        </div>
      </header>

      {/* Main Content Area with Desktop Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <SidebarNavigation role={selectedRole} />

        {/* Content View */}
        <main className="flex-1 flex flex-col overflow-y-auto pb-16 md:pb-0">
          {/* Demo flag banner when active */}
          <DemoFlagBanner
            paymentsEnabled={demoFlags.paymentsEnabled}
            faultsEnabled={demoFlags.faultsEnabled}
            eventsEnabled={demoFlags.eventsEnabled}
          />

          <div className="flex-1 py-6">
            {children}
          </div>

          <LegalFooter />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNavigation />
    </div>
  );
}
