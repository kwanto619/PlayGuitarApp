'use client';

import { usePathname } from 'next/navigation';
import SongsFlyoutNav from './SongsFlyoutNav';
import GlobalSearch from './GlobalSearch';

// Routes that render WITHOUT the sidebar/search chrome.
const BARE_ROUTES = ['/auth'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const bare = BARE_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));

  if (bare) return <>{children}</>;

  return (
    <div className="app-shell-root">
      <SongsFlyoutNav />
      <GlobalSearch />
      <main className="app-shell-main">
        {children}
      </main>

      <style>{`
        .app-shell-root {
          background: var(--bg-deep);
          color: var(--cream);
          min-height: 100vh;
        }
        .app-shell-main {
          margin-left: 240px;
          min-height: 100vh;
          background: var(--bg-deep);
          color: var(--cream);
        }
        @media (max-width: 900px) {
          .app-shell-main {
            margin-left: 0;
            padding-top: 58px;
          }
        }
      `}</style>
    </div>
  );
}
