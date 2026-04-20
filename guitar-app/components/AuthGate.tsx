'use client';

import { useAuth } from '@/lib/auth';
import Auth from './Auth';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-deep)',
        fontFamily: 'var(--font-cormorant, Georgia, serif)',
        fontSize: '1rem', letterSpacing: '0.3em', textTransform: 'uppercase',
        color: 'var(--cream-muted)',
      }}>Loading…</div>
    );
  }

  if (!user) return <Auth />;
  return <>{children}</>;
}
