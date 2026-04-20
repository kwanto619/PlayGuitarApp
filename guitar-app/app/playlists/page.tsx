import { Suspense } from 'react';
import Link from 'next/link';
import PlaylistsLibrary from '@/components/PlaylistsLibrary';
import AuthRequired from '@/components/AuthRequired';

export const metadata = { title: 'Playlists — Guitar Companion' };

export default function PlaylistsPage() {
  return (
    <main style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-base) 100%)',
        borderBottom: '1px solid var(--gold-border)',
        padding: '0 clamp(20px, 4vw, 48px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '60px',
      }}>
        <Link href="/" style={{
          padding: '8px 18px',
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: '0.9rem', fontWeight: 500, letterSpacing: '0.18em',
          textTransform: 'uppercase', cursor: 'pointer',
          border: '1px solid var(--gold-border-mid)',
          background: 'transparent', color: 'var(--cream-muted)',
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px',
          transition: 'color 0.15s, border-color 0.15s',
        }}>
          ← Home
        </Link>
        <span style={{
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: '0.78rem', letterSpacing: '0.3em',
          textTransform: 'uppercase', color: 'var(--cream-soft)',
        }}>
          ♪ Playlists
        </span>
      </div>

      {/* Content */}
      <AuthRequired feature="Playlists">
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: 'clamp(32px, 5vw, 64px) clamp(16px, 4vw, 48px)' }}>
          <Suspense fallback={
            <div style={{ textAlign: 'center', padding: '80px 20px', fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--cream-muted)', fontSize: '1.2rem' }}>
              Loading...
            </div>
          }>
            <PlaylistsLibrary />
          </Suspense>
        </div>
      </AuthRequired>
    </main>
  );
}
