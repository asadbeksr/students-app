import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-sm',
          'shadow-[rgba(0,0,0,0.075)_0px_0px_0px_0.5px_inset]',
          'placeholder:text-[#777169] focus-visible:outline-none',
          'focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:border-[#4e4e4e]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-all duration-150',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
