import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-[#3d4f5c] bg-[#2a3942] px-3 py-2 text-sm text-[#e9edef] placeholder-[#8696a0] outline-none ring-offset-[#0f172a] focus-visible:ring-2 focus-visible:ring-[#FFD700]',
        className
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';

