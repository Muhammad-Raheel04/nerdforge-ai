import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/**
 * The whole console floats as a frosted, rounded slab on a periwinkle
 * canvas - echoing the reference dashboard's "device frame" look. Confetti
 * dots on the canvas are the motif shared with the About page's orbit.
 */
export function AppLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen p-2 sm:p-4 lg:p-6">
      {/* Canvas confetti */}
      <span className="confetti-dot w-2.5 h-2.5 bg-[#f0699e] top-[12%] left-[4%] opacity-70 animate-float" />
      <span className="confetti-dot w-2 h-2 bg-[#3ecf8e] top-[70%] left-[2.5%] opacity-60 animate-float [animation-delay:1.2s]" />
      <span className="confetti-dot w-3 h-3 bg-[#fbbf24] top-[28%] right-[3%] opacity-60 animate-float [animation-delay:0.6s]" />
      <span className="confetti-dot w-2 h-2 bg-[#6d5ce6] bottom-[10%] right-[5%] opacity-70 animate-float [animation-delay:1.8s]" />

      <div className="relative flex min-h-[calc(100vh-1rem)] sm:min-h-[calc(100vh-2rem)] lg:min-h-[calc(100vh-3rem)] max-w-[1500px] mx-auto rounded-[24px] lg:rounded-[32px] border border-[var(--frame-border)] bg-[var(--frame-bg)] backdrop-blur-2xl shadow-[var(--shadow-elevated)] overflow-hidden">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar title={title} subtitle={subtitle} />
          <main className="flex-1 px-4 py-5 lg:px-8 lg:py-6 w-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
