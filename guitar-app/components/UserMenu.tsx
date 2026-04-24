'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import NotificationBell from './NotificationBell';

function UserIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8.5" r="4" />
      <path d="M3.5 20.5c1.6-4.3 5-6.5 8.5-6.5s6.9 2.2 8.5 6.5" />
    </svg>
  );
}

export default function UserMenu() {
  const { user, username, signOut } = useAuth();

  if (!user) {
    return (
      <Link href="/auth" style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        padding: '9px 14px',
        fontFamily: 'var(--font-cormorant, Georgia, serif)',
        fontSize: '0.8rem', letterSpacing: '0.18em', textTransform: 'uppercase',
        border: '1px solid var(--gold-border-mid)',
        background: 'linear-gradient(135deg, rgba(0,130,120,0.5), rgba(0,90,83,0.3))',
        color: 'var(--gold-bright)', textDecoration: 'none',
      }}>
        <UserIcon />
        Sign In
      </Link>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.8rem',
      letterSpacing: '0.18em', textTransform: 'uppercase',
    }}>
      <NotificationBell />
      {username && (
        <Link
          href={`/u/${username}`}
          title={`@${username}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '8px 14px',
            border: '1px solid var(--gold-border-mid)',
            background: 'linear-gradient(135deg, rgba(0,130,120,0.25), rgba(0,90,83,0.15))',
            color: 'var(--gold-bright)', textDecoration: 'none',
          }}
        >
          <UserIcon />
          <span className="um-label">@{username}</span>
        </Link>
      )}
      <button
        onClick={signOut}
        title="Sign out"
        style={{
          padding: '8px 14px', cursor: 'pointer',
          border: '1px solid var(--gold-border)', background: 'transparent',
          color: 'var(--cream-muted)',
          fontFamily: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: '6px',
        }}
      >
        <svg className="um-signout-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span className="um-signout-text">Sign out</span>
      </button>
    </div>
  );
}
