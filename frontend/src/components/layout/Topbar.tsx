import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../../context/useTheme';
import { api } from '../../lib/api';

const mobileNavItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/generate', label: 'Generate Attack' },
  { to: '/attacks', label: 'Attack History' },
  { to: '/about', label: 'About Us' },
];

type BackendStatus = 'checking' | 'online' | 'offline';

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [status, setStatus] = useState<BackendStatus>('checking');

  // Live backend health - polled, not hardcoded.
  useEffect(() => {
    let active = true;
    const check = () =>
      api
        .health()
        .then(() => active && setStatus('online'))
        .catch(() => active && setStatus('offline'));
    check();
    const interval = setInterval(check, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center justify-between gap-3 px-4 lg:px-8 bg-transparent">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="lg:hidden shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-[var(--shadow-violet)]"
          style={{ background: 'var(--gradient-primary)' }}
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] hidden sm:block">
            NerdForge AI
          </div>
          <h1 className="font-display font-semibold text-lg text-[var(--text-primary)] truncate leading-tight">
            {title}
          </h1>
          {subtitle && <p className="text-xs text-[var(--text-muted)] truncate hidden md:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {/* Backend status pill */}
        <span
          className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${
            status === 'online'
              ? 'bg-[var(--accent-green-soft)] text-[var(--accent-green)] border-transparent'
              : status === 'offline'
                ? 'bg-rose-500/10 text-rose-500 border-transparent'
                : 'bg-[var(--bg-hover)] text-[var(--text-muted)] border-transparent'
          }`}
          title={status === 'offline' ? 'Start the backend: uvicorn app.main:app --reload' : undefined}
        >
          <span className={`w-1.5 h-1.5 rounded-full bg-current ${status !== 'offline' ? 'animate-pulse-slow' : ''}`} />
          {status === 'online' ? 'Backend online' : status === 'offline' ? 'Backend offline' : 'Checking…'}
        </span>

        <button
          onClick={toggleTheme}
          aria-label="Toggle color theme"
          className="relative w-16 h-9 rounded-full bg-[var(--bg-surface)] border border-[var(--border-strong)] flex items-center px-1 transition-colors shadow-[var(--shadow-card)]"
        >
          <span
            className={`absolute w-7 h-7 rounded-full shadow-md transition-transform duration-300 flex items-center justify-center text-white ${
              theme === 'dark' ? 'translate-x-[28px]' : 'translate-x-0'
            }`}
            style={{ background: 'var(--gradient-primary)' }}
          >
            {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
          </span>
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden absolute top-16 left-3 right-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--shadow-elevated)] flex flex-col p-3 gap-1 z-40">
          {mobileNavItems.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `px-4 py-3 rounded-xl text-sm font-medium ${
                  isActive
                    ? 'text-white shadow-[var(--shadow-violet)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`
              }
              style={({ isActive }) => (isActive ? { background: 'var(--gradient-primary)' } : undefined)}
            >
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
}

function SunIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5m0 15V21m8.25-9h-1.5m-15 0H3m15.36-6.36l-1.06 1.06M6.7 17.3l-1.06 1.06m12.72 0L17.3 17.3M6.7 6.7L5.64 5.64M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  );
}
