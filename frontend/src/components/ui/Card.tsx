import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({ children, hoverable, padding = 'md', className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl shadow-[var(--shadow-card)] ${
        hoverable ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]' : ''
      } ${paddingClasses[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">{title}</h3>
        {subtitle && <p className="text-sm text-[var(--text-muted)] mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
