import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'h-8 w-full rounded-md border border-border bg-panel px-2 text-[13px] text-ink-primary',
          'focus:outline-none focus:ring-2 focus:ring-border-soft focus:border-ink-muted/40',
          'disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
