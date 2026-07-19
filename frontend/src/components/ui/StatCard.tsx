import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

/**
 * White rounded card with a pastel icon chip - reference dashboard style.
 * Optional `progress` (0-100) renders the thin green progress bar from the
 * reference's activity cards.
 */
export function StatCard({
  label,
  value,
  icon,
  accent = 'violet',
  trend,
  progress,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  accent?: 'violet' | 'pink' | 'green' | 'neutral';
  trend?: string;
  progress?: number;
}) {
  const accentClasses = {
    violet: 'text-[var(--accent-violet)] bg-[var(--accent-violet-soft)]',
    pink: 'text-[var(--accent-pink)] bg-[var(--accent-pink-soft)]',
    green: 'text-[var(--accent-green)] bg-[var(--accent-green-soft)]',
    neutral: 'text-[var(--text-secondary)] bg-[var(--bg-hover)]',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-5 shadow-[var(--shadow-card)]"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${accentClasses[accent]}`}>
          {icon}
        </div>
        {trend && <span className="text-xs font-medium text-[var(--text-muted)]">{trend}</span>}
      </div>
      <div className="font-display text-2xl font-bold text-[var(--text-primary)] tabular-nums">
        {value}
      </div>
      <div className="text-sm text-[var(--text-muted)] mt-0.5">{label}</div>
      {typeof progress === 'number' && (
        <div className="mt-3 h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent-green)] transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </motion.div>
  );
}
