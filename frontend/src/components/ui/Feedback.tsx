import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-[var(--border-subtle)]" />
        <div className="absolute inset-0 rounded-full border-2 border-t-[var(--accent-violet)] border-transparent animate-spin" />
      </div>
      {label && <p className="text-sm text-[var(--text-muted)]">{label}</p>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-[var(--bg-hover)] flex items-center justify-center mb-4 text-[var(--text-muted)]">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
      {description && <p className="text-sm text-[var(--text-muted)] max-w-sm mb-5">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400"
    >
      <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <span>{message}</span>
    </motion.div>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 p-1.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] overflow-x-auto max-w-full">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative px-4 py-2 text-sm font-medium whitespace-nowrap rounded-xl transition-colors ${
            active === tab.id
              ? 'text-white'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          {active === tab.id && (
            <motion.div
              layoutId="tab-pill"
              className="absolute inset-0 rounded-xl shadow-[var(--shadow-violet)]"
              style={{ background: 'var(--gradient-primary)' }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          )}
          <span className="relative flex items-center gap-2">
            {tab.label}
            {typeof tab.count === 'number' && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  active === tab.id ? 'bg-white/20' : 'bg-[var(--bg-hover)]'
                }`}
              >
                {tab.count}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
