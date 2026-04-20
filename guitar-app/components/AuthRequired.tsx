'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function AuthRequired({ feature, children }: { feature: string; children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={centerBox}>Loading…</div>
    );
  }

  if (!user) {
    return (
      <div style={{ maxWidth: '520px', margin: '80px auto', padding: '0 clamp(16px, 4vw, 32px)' }}>
        <div style={{
          position: 'relative',
          border: '1px solid var(--gold-border)',
          background: 'var(--bg-surface)',
          padding: 'clamp(32px, 5vw, 48px)',
          textAlign: 'center',
        }}>
          {([
            { top: 8, left: 8,    borderTop: '1px solid var(--gold-border-mid)', borderLeft:   '1px solid var(--gold-border-mid)' },
            { top: 8, right: 8,   borderTop: '1px solid var(--gold-border-mid)', borderRight:  '1px solid var(--gold-border-mid)' },
            { bottom: 8, left: 8, borderBottom: '1px solid var(--gold-border-mid)', borderLeft: '1px solid var(--gold-border-mid)' },
            { bottom: 8, right: 8,borderBottom: '1px solid var(--gold-border-mid)', borderRight:'1px solid var(--gold-border-mid)' },
          ] as React.CSSProperties[]).map((s, i) => <div key={i} style={{ position: 'absolute', width: 20, height: 20, ...s }} />)}

          <div style={{ fontSize: '0.6rem', letterSpacing: '0.5em', color: 'var(--gold-dim)', textTransform: 'uppercase', marginBottom: '14px' }}>
            Account Required
          </div>
          <h2 style={{
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: '1.8rem', fontWeight: 500, letterSpacing: '0.05em',
            color: 'var(--gold-bright)', margin: '0 0 12px',
          }}>
            {feature} is personal
          </h2>
          <p style={{
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: '1rem', color: 'var(--cream-soft)', lineHeight: 1.6,
            margin: '0 0 28px',
          }}>
            Sign in or create a free account to use {feature.toLowerCase()}.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth" style={primaryBtn}>Sign In / Sign Up</Link>
            <Link href="/" style={ghostBtn}>← Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

const centerBox: React.CSSProperties = {
  textAlign: 'center', padding: '80px 20px',
  fontFamily: 'var(--font-cormorant, Georgia, serif)',
  fontSize: '1rem', letterSpacing: '0.1em', color: 'var(--cream-muted)',
};

const primaryBtn: React.CSSProperties = {
  padding: '12px 24px',
  fontFamily: 'var(--font-cormorant, Georgia, serif)',
  fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.22em',
  textTransform: 'uppercase',
  border: '1px solid var(--gold-border-mid)',
  background: 'linear-gradient(135deg, rgba(0,130,120,0.6), rgba(0,90,83,0.4))',
  color: 'var(--gold-bright)', textDecoration: 'none',
};

const ghostBtn: React.CSSProperties = {
  padding: '12px 24px',
  fontFamily: 'var(--font-cormorant, Georgia, serif)',
  fontSize: '0.9rem', fontWeight: 500, letterSpacing: '0.18em',
  textTransform: 'uppercase',
  border: '1px solid var(--gold-border)',
  background: 'transparent', color: 'var(--cream-muted)', textDecoration: 'none',
};
