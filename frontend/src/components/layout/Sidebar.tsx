import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon, end: true },
  { to: '/generate', label: 'Generate Attack', icon: BoltIcon },
  { to: '/attacks', label: 'Attack History', icon: ListIcon },
  { to: '/about', label: 'About Us', icon: UsersIcon },
];

/**
 * Floating violet pill rail (icon-only), matching the reference dashboard's
 * sidebar. Active item pops out as a white squircle with a violet icon.
 * Labels appear as tooltips on hover/focus.
 */
export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col items-center w-[76px] shrink-0 my-5 ml-5 py-5 rounded-[26px] shadow-[var(--shadow-violet)]" style={{ background: 'var(--gradient-primary)' }}>
      <NavLink to="/" className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mb-7 hover:bg-white/25 transition-colors" aria-label="NerdForge AI home">
        <ShieldIcon />
      </NavLink>

      <nav className="flex-1 flex flex-col items-center gap-3" aria-label="Main navigation">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            className={({ isActive }) =>
              `group relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'bg-white text-[var(--color-violet-brand)] shadow-lg scale-105'
                  : 'text-white/75 hover:bg-white/15 hover:text-white'
              }`
            }
          >
            <Icon className="w-[22px] h-[22px]" />
            {/* Tooltip */}
            <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-[var(--text-primary)] text-[var(--bg-surface)] text-xs font-medium whitespace-nowrap opacity-0 -translate-x-1 pointer-events-none transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 z-50">
              {label}
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-4 flex flex-col items-center gap-1.5" title="DYLP Hackathon 2026">
        <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse-slow" />
        <span className="text-[9px] font-semibold tracking-widest text-white/60 uppercase [writing-mode:vertical-lr] rotate-180">
          DYLP '26
        </span>
      </div>
    </aside>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}
function DashboardIcon(props: { className?: string }) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}
function BoltIcon(props: { className?: string }) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}
function ListIcon(props: { className?: string }) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}
function UsersIcon(props: { className?: string }) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}
