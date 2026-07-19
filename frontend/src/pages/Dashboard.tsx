import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Button } from '../components/ui/Button';
import { Spinner, EmptyState, ErrorBanner } from '../components/ui/Feedback';
import { SeverityDonut } from '../components/charts/SeverityDonut';
import { MitreCoverageChart } from '../components/charts/BarCharts';
import { api } from '../lib/api';
import type { AttackDetail, AttackListItem } from '../lib/types';

export function Dashboard() {
  const [attacks, setAttacks] = useState<AttackListItem[]>([]);
  const [details, setDetails] = useState<AttackDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const list = await api.listAttacks(0, 50);
        if (cancelled) return;
        setAttacks(list);

        const recent = list.slice(0, 6);
        const detailResults = await Promise.all(
          recent.map((a) => api.getAttack(a.id).catch(() => null))
        );
        if (cancelled) return;
        setDetails(detailResults.filter((d): d is AttackDetail => d !== null));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const completed = attacks.filter((a) => a.status === 'completed').length;
    const scores = details
      .map((d) => Number(d.summary?.severity_score))
      .filter((n) => !Number.isNaN(n));
    const avgSeverity = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

    const priorityCounts: Record<string, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    details.forEach((d) => {
      const p = String(d.summary?.priority || '').trim();
      const key = Object.keys(priorityCounts).find((k) => k.toLowerCase() === p.toLowerCase());
      if (key) priorityCounts[key] += 1;
    });

    const allStages = details.flatMap((d) => d.tactics || []);

    // Wave data for the overview panel: severity score per recent attack,
    // oldest → newest so the line reads left to right in time.
    const wave = [...details]
      .reverse()
      .map((d) => ({
        name: d.name.length > 14 ? d.name.slice(0, 13) + '…' : d.name,
        score: Number(d.summary?.severity_score) || 0,
      }));

    return { total: attacks.length, completed, avgSeverity, priorityCounts, allStages, wave };
  }, [attacks, details]);

  return (
    <AppLayout title="Dashboard" subtitle="Live overview of simulated attacks and detections">
      <div className="flex flex-col gap-6">
        {error && <ErrorBanner message={error} />}

        {loading ? (
          <Spinner label="Loading dashboard…" />
        ) : attacks.length === 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <OverviewPanel stats={stats} empty />
            </div>
            <GenerateCta />
            <Card className="lg:col-span-3">
              <EmptyState
                icon={<RadarIcon />}
                title="No attacks generated yet"
                description="Kick off your first AI-generated attack scenario to populate the dashboard."
                action={
                  <Link to="/generate">
                    <Button>Generate your first attack</Button>
                  </Link>
                }
              />
            </Card>
          </div>
        ) : (
          <>
            {/* Overview panel + CTA column */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <OverviewPanel stats={stats} />
              </div>
              <div className="flex flex-col gap-6">
                <GenerateCta />
                <Card className="flex-1">
                  <CardHeader title="Completion" subtitle="Scenarios fully analyzed" />
                  <div className="flex items-end justify-between">
                    <div className="font-display text-3xl font-bold text-[var(--text-primary)] tabular-nums">
                      {stats.completed}
                      <span className="text-base font-semibold text-[var(--text-muted)]">/{stats.total}</span>
                    </div>
                    <span className="text-xs font-semibold text-[var(--accent-green)]">
                      {stats.total ? Math.round((stats.completed / stats.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--accent-green)] transition-all duration-700"
                      style={{ width: `${stats.total ? (stats.completed / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </Card>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total attacks" value={stats.total} accent="violet" icon={<TargetIcon />} />
              <StatCard
                label="Completed"
                value={stats.completed}
                accent="green"
                icon={<CheckIcon />}
                progress={stats.total ? (stats.completed / stats.total) * 100 : 0}
              />
              <StatCard
                label="Avg severity score"
                value={stats.avgSeverity !== null ? `${stats.avgSeverity}/100` : '—'}
                accent="pink"
                icon={<GaugeIcon />}
                progress={stats.avgSeverity ?? undefined}
              />
              <StatCard label="Stages analyzed" value={stats.allStages.length} accent="neutral" icon={<LayersIcon />} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader title="Priority breakdown" subtitle="SOC-assigned priority across recent attacks" />
                <SeverityDonut counts={stats.priorityCounts} centerLabel="attacks" />
              </Card>
              <Card className="lg:col-span-3">
                <CardHeader title="MITRE tactic coverage" subtitle="Stage frequency across recent scenarios" />
                <MitreCoverageChart stages={stats.allStages} />
              </Card>
            </div>

            {/* Recent attacks */}
            <Card padding="none">
              <div className="p-6 pb-0">
                <CardHeader
                  title="Recent attacks"
                  subtitle="Latest generated scenarios"
                  action={
                    <Link to="/attacks" className="text-sm font-medium text-[var(--accent-violet)] hover:underline">
                      View all →
                    </Link>
                  }
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[var(--text-muted)] uppercase tracking-wide border-y border-[var(--border-subtle)]">
                      <th className="px-6 py-3 font-medium">Name</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Created</th>
                      <th className="px-6 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {attacks.slice(0, 8).map((a) => (
                      <tr
                        key={a.id}
                        className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-hover)] transition-colors"
                      >
                        <td className="px-6 py-3.5 font-medium text-[var(--text-primary)]">{a.name}</td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                              a.status === 'completed'
                                ? 'bg-[var(--accent-green-soft)] text-[var(--accent-green)]'
                                : 'bg-amber-500/10 text-amber-500'
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-[var(--text-muted)]">
                          {new Date(a.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <Link
                            to={`/attacks/${a.id}`}
                            className="text-[var(--accent-violet)] hover:underline font-medium"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}

/* ------------------------------------------------------------------------ */

/** The violet "Overview" panel with a severity wave - the page's signature. */
function OverviewPanel({
  stats,
  empty,
}: {
  stats: {
    total: number;
    avgSeverity: number | null;
    wave: { name: string; score: number }[];
  };
  empty?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative h-full min-h-[260px] rounded-3xl p-6 lg:p-7 text-white overflow-hidden shadow-[var(--shadow-violet)]"
      style={{ background: 'var(--gradient-primary)' }}
    >
      {/* Soft glow orbs */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-[#f0699e]/25 blur-2xl pointer-events-none" />
      <span className="confetti-dot w-1.5 h-1.5 bg-white/70 top-8 right-24 animate-twinkle" />
      <span className="confetti-dot w-2 h-2 bg-[#fbbf24]/80 top-16 right-10 animate-twinkle [animation-delay:1s]" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-white/70">Threat overview</div>
          <h2 className="font-display text-xl lg:text-2xl font-bold mt-1 leading-snug max-w-sm">
            {empty
              ? 'Generate an attack. Watch it get detected, analyzed, and reported.'
              : 'Severity across your recent simulations'}
          </h2>
        </div>
        {!empty && (
          <div className="text-right shrink-0">
            <div className="font-display text-3xl font-bold tabular-nums">
              {stats.avgSeverity !== null ? stats.avgSeverity : '—'}
            </div>
            <div className="text-xs text-white/70">avg severity /100</div>
          </div>
        )}
      </div>

      <div className="relative mt-4 h-[140px]">
        {stats.wave.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.wave} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="wave-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="name"
                tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                cursor={{ stroke: 'rgba(255,255,255,0.4)', strokeDasharray: '3 3' }}
                contentStyle={{
                  background: 'rgba(30,25,70,0.92)',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 12,
                  color: '#fff',
                }}
                labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                formatter={(v) => [`${v}/100`, 'severity']}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#ffffff"
                strokeWidth={2.5}
                fill="url(#wave-fill)"
                dot={{ r: 3, fill: '#fff', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#f0699e', strokeWidth: 2, stroke: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-white/70">
            {empty
              ? 'From MITRE-mapped scenario to IOCs, detection rules, and an executive report.'
              : 'Generate a couple more attacks to see the severity trend.'}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/** Pink CTA card - the reference's "My Jogging" card, repurposed. */
function GenerateCta() {
  return (
    <Link to="/generate" className="group block">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative rounded-3xl p-6 text-white overflow-hidden shadow-[var(--shadow-pink)] transition-transform duration-200 group-hover:-translate-y-0.5"
        style={{ background: 'var(--gradient-pink)' }}
      >
        <div className="absolute -bottom-10 -right-10 w-36 h-36 rounded-full bg-white/15 blur-xl pointer-events-none" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
              <BoltIcon />
            </div>
            <div className="font-display text-lg font-bold leading-tight">Generate new attack</div>
            <p className="text-sm text-white/80 mt-1">AI builds the scenario, the SOC analyst grades it.</p>
          </div>
          <span className="shrink-0 w-11 h-11 rounded-full bg-white text-[var(--color-pink-brand)] flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:translate-x-1">
            <ArrowIcon />
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

/* Icons ------------------------------------------------------------------ */

function BoltIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}
function TargetIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c.866 1.5 2.13 2.851 3.676 3.919m11.254-3.919c-.866 1.5-2.13 2.851-3.676 3.919M12 21a8.966 8.966 0 01-3.628-.756M12 21a8.966 8.966 0 003.628-.756M12 3c-4.97 0-9 4.03-9 9M12 3c4.97 0 9 4.03 9 9m-9-9v3.75" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function GaugeIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zM15.75 8.25a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  );
}
function LayersIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m-11.142 0L12 12m9.75-2.25L17.571 12M12 12l5.571-3M12 12v9.75" />
    </svg>
  );
}
function RadarIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zm0-4.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9zM12 12L20.25 4.5" />
    </svg>
  );
}
