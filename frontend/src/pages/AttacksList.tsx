import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner, EmptyState, ErrorBanner } from '../components/ui/Feedback';
import { api } from '../lib/api';
import type { AttackListItem } from '../lib/types';

export function AttacksList() {
  const [attacks, setAttacks] = useState<AttackListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    api
      .listAttacks(0, 100)
      .then(setAttacks)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load attacks'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return attacks;
    const q = query.toLowerCase();
    return attacks.filter((a) => a.name.toLowerCase().includes(q));
  }, [attacks, query]);

  return (
    <AppLayout title="Attack History" subtitle="Every scenario generated so far">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-xs">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent-violet)] transition-colors"
            />
          </div>
          <Link to="/generate">
            <Button size="md">+ New Attack</Button>
          </Link>
        </div>

        {error && <ErrorBanner message={error} />}

        {loading ? (
          <Spinner label="Loading attack history…" />
        ) : filtered.length === 0 ? (
          <Card>
            <EmptyState
              title={query ? 'No matches' : 'No attacks yet'}
              description={query ? 'Try a different search term.' : 'Generate your first scenario to see it here.'}
              action={
                !query && (
                  <Link to="/generate">
                    <Button>Generate an attack</Button>
                  </Link>
                )
              }
            />
          </Card>
        ) : (
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--text-muted)] uppercase tracking-wide border-b border-[var(--border-subtle)]">
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Created</th>
                    <th className="px-6 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      <td className="px-6 py-3.5 font-medium text-[var(--text-primary)]">{a.name}</td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
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
                        <Link to={`/attacks/${a.id}`} className="text-[var(--accent-violet)] hover:underline font-medium">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function SearchIcon(props: { className?: string }) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}
