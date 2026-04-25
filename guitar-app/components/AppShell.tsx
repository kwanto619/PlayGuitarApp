'use client';

import { usePathname } from 'next/navigation';
import SongsFlyoutNav from './SongsFlyoutNav';
import UserMenu from './UserMenu';

// Routes that render WITHOUT the sidebar/search chrome.
const BARE_ROUTES = ['/auth'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const bare = BARE_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));

  if (bare) return <>{children}</>;

  return (
    <div className="app-shell-root">
      <SongsFlyoutNav />
      <div className="app-shell-usermenu">
        <UserMenu />
      </div>
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
        .app-shell-usermenu {
          position: fixed;
          top: 14px;
          right: 16px;
          z-index: 30;
        }
        @media (max-width: 900px) {
          .app-shell-main {
            margin-left: 0;
            padding-top: 58px;
          }
          .app-shell-usermenu {
            top: 10px;
            right: 10px;
          }
        }
      `}</style>
    </div>
  );
}
