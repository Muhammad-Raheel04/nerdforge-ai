import type { ReactNode } from 'react';

export function Badge({
  children,
  color = 'neutral',
}: {
  children: ReactNode;
  color?: 'neutral' | 'cyan' | 'violet' | 'pink' | 'success';
}) {
  const colorMap = {
    neutral: 'bg-[var(--bg-hover)] text-[var(--text-secondary)] border-transparent',
    // "cyan" kept as an accepted value for back-compat; renders violet now
    cyan: 'bg-[var(--accent-violet-soft)] text-[var(--accent-violet)] border-transparent',
    violet: 'bg-[var(--accent-violet-soft)] text-[var(--accent-violet)] border-transparent',
    pink: 'bg-[var(--accent-pink-soft)] text-[var(--accent-pink)] border-transparent',
    success: 'bg-[var(--accent-green-soft)] text-[var(--accent-green)] border-transparent',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorMap[color]}`}
    >
      {children}
    </span>
  );
}

const severityStyles: Record<string, { bg: string; text: string; dot: string }> = {
  low: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', dot: 'bg-emerald-500' },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-500', dot: 'bg-amber-500' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-500', dot: 'bg-orange-500' },
  critical: { bg: 'bg-rose-500/10', text: 'text-rose-500', dot: 'bg-rose-500' },
};

export function SeverityBadge({ severity }: { severity: string }) {
  const key = (severity || 'medium').toLowerCase();
  const style = severityStyles[key] || severityStyles.medium;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} animate-pulse-slow`} />
      {severity}
    </span>
  );
}
