import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    '[background:var(--gradient-primary)] text-white shadow-[var(--shadow-violet)] hover:brightness-110 hover:-translate-y-px active:translate-y-0 active:brightness-95',
  secondary:
    'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-[var(--shadow-card)] hover:border-[var(--accent-violet)] hover:bg-[var(--bg-hover)]',
  ghost:
    'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
  danger:
    'bg-[var(--bg-surface)] text-rose-500 border border-rose-500/30 hover:bg-rose-500/10 hover:border-rose-500/60',
};

const sizeClasses: Record<Size, string> = {
  sm: 'text-xs px-3.5 py-2 gap-1.5 rounded-xl',
  md: 'text-sm px-5 py-2.5 gap-2 rounded-2xl',
  lg: 'text-base px-7 py-3.5 gap-2.5 rounded-2xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:brightness-100 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-90"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
