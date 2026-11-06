import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  hasError?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, hasError, id, ...props }, ref) => {
    const errorState = Boolean(error || hasError);

    return (
      <input
        ref={ref}
        id={id}
        aria-invalid={errorState ? 'true' : 'false'}
        aria-describedby={error && id ? `${id}-error` : undefined}
        className={`w-full min-h-[44px] px-3.5 py-2 text-sm bg-surface-card text-text-primary rounded-md border transition-colors duration-fast placeholder:text-text-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
          errorState ? 'border-status-danger ring-1 ring-status-danger' : 'border-border'
        } ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export interface FieldProps {
  id: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Field: React.FC<FieldProps> = ({
  id,
  label,
  description,
  error,
  required,
  children,
  className = '',
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-text-primary uppercase tracking-wider"
        >
          {label} {required && <span className="text-status-danger" aria-hidden="true">*</span>}
        </label>
      </div>

      {description && (
        <p className="text-xs text-text-secondary leading-normal">{description}</p>
      )}

      <div>{children}</div>

      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-status-danger font-medium">
          {error}
        </p>
      )}
    </div>
  );
};
