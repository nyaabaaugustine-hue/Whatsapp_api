import * as React from 'react';
import { cn } from '../../lib/utils';

type Variant = 'default' | 'secondary' | 'destructive' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  'inline-flex items-center justify-center font-medium rounded-md transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FFD700] ring-offset-[#0f172a]';

const variants: Record<Variant, string> = {
  default: 'bg-[#00a884] text-white hover:bg-[#008f72]',
  secondary: 'bg-[#2a3942] text-[#e9edef] hover:bg-[#3d4f5c] border border-[#3d4f5c]',
  destructive: 'bg-[#b42318] text-white hover:bg-[#942017]',
  ghost: 'bg-transparent text-[#e9edef] hover:bg-[#13202a]',
  outline: 'border border-[#3d4f5c] text-[#e9edef] hover:bg-[#13202a]',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

