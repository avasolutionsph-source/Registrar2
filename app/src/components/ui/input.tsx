import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-8 w-full rounded-md border border-border bg-panel px-2.5 text-[13px] text-ink-primary placeholder:text-ink-muted',
          'focus:outline-none focus:ring-2 focus:ring-border-soft focus:border-ink-muted/40',
          'disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);
