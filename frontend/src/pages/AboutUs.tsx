import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppLayout } from '../components/layout/AppLayout';
import { Card } from '../components/ui/Card';
import { projectInfo, teamMembers as team, type TeamMember } from '../data/team';

export function AboutUs() {
  const [selectedIdx, setSelectedIdx] = useState(0);

  const selected = team[Math.min(selectedIdx, team.length - 1)];

  const next = () => setSelectedIdx((i) => (i + 1) % team.length);
  const prev = () => setSelectedIdx((i) => (i - 1 + team.length) % team.length);

  return (
    <AppLayout title="About Us" subtitle="The crew behind NerdForge AI">
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        {/* ------------------------------------------------------------ */}
        {/* Space Explorer panel - team members orbit like planets        */}
        {/* ------------------------------------------------------------ */}
        <section
          className="relative rounded-3xl overflow-hidden text-white shadow-[var(--shadow-elevated)]"
          style={{ background: 'linear-gradient(165deg, #3d3c96 0%, #262768 48%, #171b4d 100%)' }}
          aria-label="Team crew explorer"
        >
          <Stars />

          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 p-6 sm:p-8 lg:p-10">
            {/* Left: heading + orbit */}
            <div className="flex flex-col">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-white/60">{projectInfo.name}</div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold leading-tight mt-1">
                  Crew
                  <br />
                  Explorer
                  <span className="inline-block w-2 h-2 rounded-full bg-[#fbbf24] ml-2 align-middle" />
                </h2>
              </div>

              <Orbit team={team} selectedIdx={selectedIdx} onSelect={setSelectedIdx} />
            </div>

            {/* Right: selected member card (the "Earth" card) */}
            <div className="flex flex-col justify-center min-w-0">
              <AnimatePresence mode="wait">
                {selected && (
                  <motion.div
                    key={selected.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22 }}
                    className="relative rounded-3xl bg-white/95 backdrop-blur text-[#232343] p-6 sm:p-7 shadow-2xl overflow-hidden"
                  >
                    {/* Ghost index number, like the big "3" in the reference */}
                    <span
                      aria-hidden
                      className="absolute -top-4 right-3 font-display font-extrabold text-[7rem] leading-none text-[#232343]/5 select-none pointer-events-none"
                    >
                      {selectedIdx + 1}
                    </span>

                    <div className="relative flex items-center gap-4">
                      <MemberAvatar member={selected} size="lg" />
                      <div className="min-w-0">
                        <h3 className="font-display text-xl sm:text-2xl font-bold text-[#1d2456] truncate">
                          {selected.name}
                        </h3>
                        <div className="text-sm font-semibold text-[var(--color-pink-brand)]">{selected.role}</div>
                      </div>
                    </div>

                    <p className="relative text-sm leading-relaxed text-[#55567a] mt-4 min-h-[3.5rem]">
                      {selected.bio}
                    </p>

                    <div className="relative flex items-center justify-between mt-5">
                      <div className="flex items-center gap-3 text-sm font-medium">
                        {selected.links.github && (
                          <a
                            href={selected.links.github}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#55567a] hover:text-[var(--color-violet-brand)]"
                          >
                            GitHub
                          </a>
                        )}
                        {selected.links.linkedin && (
                          <a
                            href={selected.links.linkedin}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#55567a] hover:text-[var(--color-violet-brand)]"
                          >
                            LinkedIn
                          </a>
                        )}
                        {selected.links.email && (
                          <a
                            href={`mailto:${selected.links.email}`}
                            className="text-[#55567a] hover:text-[var(--color-violet-brand)]"
                          >
                            Email
                          </a>
                        )}
                      </div>

                      {team.length > 1 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={prev}
                            aria-label="Previous team member"
                            className="w-9 h-9 rounded-full border border-[#e3e6ee] text-[#55567a] flex items-center justify-center hover:bg-[#f2f3fa] transition-colors"
                          >
                            <ArrowLeftIcon />
                          </button>
                          <button
                            onClick={next}
                            aria-label="Next team member"
                            className="w-11 h-11 rounded-full bg-[#fbbf24] text-white flex items-center justify-center shadow-lg hover:brightness-105 hover:translate-x-0.5 transition-all"
                          >
                            <ArrowRightIcon />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Crew strip */}
              <div className="flex items-center justify-center lg:justify-start gap-2 mt-5">
                <div className="flex -space-x-2">
                  {team.slice(0, 5).map((m, i) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedIdx(i)}
                      aria-label={`Show ${m.name}`}
                      className={`rounded-full ring-2 transition-transform hover:scale-110 hover:z-10 ${
                        i === selectedIdx ? 'ring-[#fbbf24] z-10' : 'ring-white/30'
                      }`}
                    >
                      <MemberAvatar member={m} size="xs" />
                    </button>
                  ))}
                </div>
                <span className="text-xs text-white/60">
                  {team.length} crew member{team.length === 1 ? '' : 's'} on this mission
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Project info */}
        <Card>
          <h2 className="font-display text-xl font-bold text-[var(--text-primary)] mb-1">{projectInfo.name}</h2>
          <p className="text-sm text-[var(--accent-pink)] font-semibold mb-3">{projectInfo.tagline}</p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{projectInfo.summary}</p>
        </Card>
      </div>
    </AppLayout>
  );
}

/* ------------------------------------------------------------------------ */
/* Orbit: crew avatars circle the selected member like planets              */
/* ------------------------------------------------------------------------ */

function Orbit({
  team,
  selectedIdx,
  onSelect,
}: {
  team: TeamMember[];
  selectedIdx: number;
  onSelect: (i: number) => void;
}) {
  const selected = team[Math.min(selectedIdx, team.length - 1)];
  const others = useMemo(
    () => team.map((m, i) => ({ m, i })).filter(({ i }) => i !== selectedIdx),
    [team, selectedIdx]
  );

  return (
    <div className="relative w-full max-w-[380px] aspect-square mx-auto mt-6 select-none">
      {/* Rotating dashed orbit rings - dashes make the spin visible */}
      <div className="absolute inset-0 rounded-full border border-dashed border-white/15 animate-orbit" />
      <div className="absolute inset-[15%] rounded-full border border-dashed border-white/10 animate-orbit-reverse" />

      {/* Center planet: the selected member */}
      <div className="absolute inset-0 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={selected?.id ?? 'none'}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="relative animate-float"
          >
            <div className="absolute inset-0 rounded-full bg-[#6d5ce6]/50 blur-2xl scale-125 pointer-events-none" />
            {selected && <MemberAvatar member={selected} size="xl" glow />}
            <RocketIcon className="absolute -bottom-2 -right-6 w-10 h-10 rotate-12 drop-shadow-lg" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Orbiting crew */}
      {others.map(({ m, i }, orbitPos) => {
        const angle = (360 / Math.max(others.length, 1)) * orbitPos - 90;
        const rad = (angle * Math.PI) / 180;
        const r = 50; // % of container
        const x = 50 + r * Math.cos(rad);
        const y = 50 + r * Math.sin(rad);
        return (
          <button
            key={m.id}
            onClick={() => onSelect(i)}
            aria-label={`Select ${m.name}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform duration-200 hover:scale-110 animate-float"
            style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${orbitPos * 0.9}s` }}
          >
            <MemberAvatar member={m} size="sm" ring />
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------------ */

const sizeMap = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-14 h-14 text-sm',
  md: 'w-14 h-14 text-sm',
  lg: 'w-20 h-20 text-xl',
  xl: 'w-32 h-32 sm:w-36 sm:h-36 text-3xl',
} as const;

function MemberAvatar({
  member,
  size = 'md',
  ring,
  glow,
}: {
  member: TeamMember;
  size?: keyof typeof sizeMap;
  ring?: boolean;
  glow?: boolean;
}) {
  const initials = member.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const base = `${sizeMap[size]} rounded-full object-cover shrink-0 ${
    ring ? 'ring-2 ring-white/40' : ''
  } ${glow ? 'ring-4 ring-white/25 shadow-[0_0_40px_rgba(109,92,230,0.6)]' : ''}`;

  if (member.photoUrl) {
    return (
      <img
        src={member.photoUrl}
        alt={member.name}
        className={`${base} bg-[#2a2b56]`}
        onError={(e) => {
          // Fall back to initials if the image path is wrong
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  return (
    <div
      className={`${base} flex items-center justify-center font-display font-bold text-white`}
      style={{ background: 'var(--gradient-primary)' }}
    >
      {initials || '?'}
    </div>
  );
}

function Stars() {
  // Fixed positions so the sky doesn't reshuffle on every render
  const stars = [
    { top: '8%', left: '12%', s: 3, d: '0s' },
    { top: '18%', left: '78%', s: 2, d: '0.8s' },
    { top: '30%', left: '48%', s: 2, d: '1.6s' },
    { top: '62%', left: '8%', s: 2, d: '0.4s' },
    { top: '74%', left: '86%', s: 3, d: '1.2s' },
    { top: '86%', left: '32%', s: 2, d: '2s' },
    { top: '12%', left: '55%', s: 2, d: '2.4s' },
    { top: '48%', left: '92%', s: 2, d: '0.2s' },
  ];
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none">
      {stars.map((st, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{ top: st.top, left: st.left, width: st.s, height: st.s, animationDelay: st.d }}
        />
      ))}
      {/* A few colored confetti dots, tying back to the dashboard canvas */}
      <span className="confetti-dot w-2 h-2 bg-[#f0699e] top-[22%] right-[6%] opacity-80" />
      <span className="confetti-dot w-2.5 h-2.5 bg-[#3ecf8e] bottom-[14%] left-[5%] opacity-70" />
      <span className="confetti-dot w-2 h-2 bg-[#fbbf24] top-[6%] left-[38%] opacity-80" />
    </div>
  );
}

/* Icons ------------------------------------------------------------------ */

function ArrowLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}
function ArrowRightIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}
function RocketIcon(props: { className?: string }) {
  return (
    <svg {...props} viewBox="0 0 48 48" fill="none" aria-hidden>
      {/* body */}
      <path d="M24 6c5 4 8 10 8 17l-8 6-8-6c0-7 3-13 8-17z" fill="#f4f5fb" stroke="#d3d3ea" strokeWidth="1.5" />
      {/* window */}
      <circle cx="24" cy="19" r="3.5" fill="#6d5ce6" stroke="#fff" strokeWidth="1.5" />
      {/* fins */}
      <path d="M16 23l-5 7 7-1" fill="#f0699e" />
      <path d="M32 23l5 7-7-1" fill="#f0699e" />
      {/* flame */}
      <path d="M24 30l-2.5 7L24 42l2.5-5z" fill="#fbbf24" />
    </svg>
  );
}
