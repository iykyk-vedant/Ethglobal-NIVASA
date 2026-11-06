import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    // 44px minimum target height per UI §10.1 & WCAG AA
    const sizeClasses = {
      sm: 'min-h-[40px] px-3 py-1.5 text-xs',
      md: 'min-h-[44px] px-4 py-2.5 text-sm',
      lg: 'min-h-[48px] px-6 py-3 text-base',
    }[size];

    const variantClasses = {
      primary:
        'bg-brand-primary text-surface-card hover:bg-brand-secondary active:bg-brand-primary shadow-sm',
      secondary:
        'bg-surface-card text-brand-primary border border-border hover:bg-surface-muted active:bg-surface-page',
      destructive:
        'bg-status-danger text-surface-card hover:opacity-90 active:opacity-100',
      outline:
        'bg-transparent text-text-primary border border-border hover:bg-surface-muted',
      ghost:
        'bg-transparent text-text-primary hover:bg-surface-muted',
    }[variant];

    const focusClasses =
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page';

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center font-medium rounded-md transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed select-none ${sizeClasses} ${variantClasses} ${focusClasses} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span>Loading...</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
