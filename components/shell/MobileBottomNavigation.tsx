"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Wallet,
  ShieldCheck,
  Sliders,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: typeof Building2;
}

const navItems: NavItem[] = [
  {
    label: "Offering",
    href: "/offerings/33333333-3333-3333-3333-333333333333",
    icon: Building2,
  },
  {
    label: "Investor",
    href: "/investor",
    icon: Wallet,
  },
  {
    label: "Verify",
    href: "/verify/offering/33333333-3333-3333-3333-333333333333",
    icon: ShieldCheck,
  },
  {
    label: "Ops & Demo",
    href: "/admin/ops",
    icon: Sliders,
  },
];

export function MobileBottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface-card border-t border-border shadow-elevation-card"
    >
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-h-[48px] px-1 text-xs font-medium transition-colors ${
                isActive
                  ? "text-brand-primary font-semibold"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 ${isActive ? "text-brand-primary" : "text-text-secondary"}`} />
              <span className="truncate max-w-[72px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
