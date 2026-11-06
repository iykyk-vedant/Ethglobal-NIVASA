import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-text-secondary ${className}`}>
      <ol className="flex items-center space-x-1.5 flex-wrap">
        <li>
          <Link
            href="/"
            aria-label="Home"
            className="flex items-center text-text-secondary hover:text-brand-primary transition-colors"
          >
            <Home className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center space-x-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-text-secondary/60 shrink-0" aria-hidden="true" />
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-brand-primary transition-colors truncate max-w-[200px]"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={`truncate max-w-[240px] ${
                    isLast ? 'font-semibold text-text-primary' : 'text-text-secondary'
                  }`}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
