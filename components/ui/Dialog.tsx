'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className = '',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement;

      // Handle Escape key to close
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      // Focus the dialog panel
      setTimeout(() => {
        dialogRef.current?.focus();
      }, 50);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
        previouslyFocusedElementRef.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-primary/60 backdrop-blur-sm"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? 'dialog-description' : undefined}
        tabIndex={-1}
        className={`w-full max-w-lg bg-surface-card rounded-lg border border-border shadow-popover overflow-hidden focus-visible:outline-none ${className}`}
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border">
          <div>
            <h2 id="dialog-title" className="text-lg font-semibold text-text-primary">
              {title}
            </h2>
            {description && (
              <p id="dialog-description" className="text-sm text-text-secondary mt-1">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>

        <div className="px-6 py-4 bg-surface-muted/50 border-t border-border flex items-center justify-end gap-3">
          {footer || (
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
