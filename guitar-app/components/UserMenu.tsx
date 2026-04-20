'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function UserMenu() {
  const { user, username, signOut } = useAuth();

  if (!user) {
    return (
      <Link href="/auth" style={{
        padding: '8px 14px',
        fontFamily: 'var(--font-cormorant, Georgia, serif)',
        fontSize: '0.8rem', letterSpacing: '0.18em', textTransform: 'uppercase',
        border: '1px solid var(--gold-border-mid)',
        background: 'linear-gradient(135deg, rgba(0,130,120,0.5), rgba(0,90,83,0.3))',
        color: 'var(--gold-bright)', textDecoration: 'none',
      }}>
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
      {username && (
        <Link
          href={`/u/${username}`}
          style={{
            padding: '8px 14px',
            border: '1px solid var(--gold-border-mid)',
            color: 'var(--gold-bright)', textDecoration: 'none',
          }}
        >
          @{username}
        </Link>
      )}
      <button
        onClick={signOut}
        style={{
          padding: '8px 14px', cursor: 'pointer',
          border: '1px solid var(--gold-border)', background: 'transparent',
          color: 'var(--cream-muted)',
          fontFamily: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit',
        }}
      >
        Sign out
      </button>
    </div>
  );
}
