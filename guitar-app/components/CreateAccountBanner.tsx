'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';

// Signed-out call-to-action shown on the home dashboard.
export default function CreateAccountBanner() {
  const { user, loading } = useAuth();
  const [hovered, setHovered] = useState(false);
  if (loading || user) return null;

  return (
    <div style={{
      width: '100%', maxWidth: '1280px', margin: '0 auto',
      padding: 'clamp(24px, 4vw, 44px) clamp(16px, 3vw, 36px) 0',
      boxSizing: 'border-box',
    }}>
      <section style={{
        position: 'relative',
        border: '1px solid var(--gold-border)',
        background: 'var(--bg-card)',
        padding: 'clamp(22px, 3.5vw, 34px) clamp(18px, 3.5vw, 38px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 'clamp(18px, 3vw, 36px)', flexWrap: 'wrap',
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(23,58,54,0.05)',
      }}>
        {/* Soft teal glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 120% at 15% 50%, rgba(0,196,180,0.08) 0%, transparent 65%)',
        }} />
        {/* Corner accents */}
        {([
          { top: 6,    left: 6,   borderTop:    '1px solid var(--gold-border-mid)', borderLeft:   '1px solid var(--gold-border-mid)' },
          { top: 6,    right: 6,  borderTop:    '1px solid var(--gold-border-mid)', borderRight:  '1px solid var(--gold-border-mid)' },
          { bottom: 6, left: 6,   borderBottom: '1px solid var(--gold-border-mid)', borderLeft:   '1px solid var(--gold-border-mid)' },
          { bottom: 6, right: 6,  borderBottom: '1px solid var(--gold-border-mid)', borderRight:  '1px solid var(--gold-border-mid)' },
        ] as React.CSSProperties[]).map((s, i) => (
          <div key={i} style={{ position: 'absolute', width: 16, height: 16, ...s }} />
        ))}

        <div style={{ position: 'relative', flex: '1 1 320px', minWidth: 'min(100%, 260px)' }}>
          <div style={{
            fontSize: '0.62rem', letterSpacing: '0.42em', textTransform: 'uppercase',
            color: 'var(--gold-dim)', fontFamily: 'var(--font-cormorant, Georgia, serif)',
            marginBottom: '8px',
          }}>
            Free Account
          </div>
          <h2 style={{
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: 'clamp(1.35rem, 2.6vw, 1.8rem)', fontWeight: 600,
            letterSpacing: '0.05em', color: 'var(--gold-bright)',
            margin: '0 0 10px', lineHeight: 1.2,
          }}>
            Unlock the full experience — it&apos;s free
          </h2>
          <p style={{
            fontSize: 'clamp(0.88rem, 1.4vw, 0.98rem)', color: 'var(--cream-soft)',
            lineHeight: 1.6, margin: 0, maxWidth: '56ch',
          }}>
            Create a free account to heart your favorites, build playlists and
            setlists, keep your music books on every device, and follow other players.
          </p>
        </div>

        <div style={{
          position: 'relative', flex: '1 1 230px', maxWidth: '320px',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          <Link
            href="/auth?mode=signup"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              display: 'block', textAlign: 'center', textDecoration: 'none',
              padding: '14px 22px',
              fontFamily: 'var(--font-cormorant, Georgia, serif)',
              fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.22em',
              textTransform: 'uppercase',
              border: `1px solid ${hovered ? 'var(--gold)' : 'var(--gold-border-mid)'}`,
              background: 'linear-gradient(135deg, rgba(13,148,136,0.16), rgba(13,148,136,0.04))',
              color: 'var(--gold-bright)',
              boxShadow: hovered ? '0 0 24px rgba(0,232,213,0.18)' : 'none',
              transition: 'border-color 0.25s, box-shadow 0.25s',
            }}
          >
            Create Free Account →
          </Link>
          <Link href="/auth" style={{
            textAlign: 'center', textDecoration: 'underline',
            color: 'var(--cream-muted)', fontSize: '0.82rem',
            fontFamily: 'var(--font-cormorant, Georgia, serif)', letterSpacing: '0.08em',
          }}>
            Already have an account? Sign in
          </Link>
        </div>
      </section>
    </div>
  );
}
