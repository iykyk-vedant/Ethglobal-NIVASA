import React from 'react';

export interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '7xl' | 'full';
  className?: string;
}

export function PageContainer({
  children,
  maxWidth = '7xl',
  className = '',
}: PageContainerProps) {
  const maxWidthClass = {
    sm: 'max-w-3xl',
    md: 'max-w-5xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    '7xl': 'max-w-[1440px]',
    full: 'max-w-full',
  }[maxWidth];

  return (
    <main className={`w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 ${maxWidthClass} ${className}`}>
      {children}
    </main>
  );
}
