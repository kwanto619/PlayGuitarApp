import Link from 'next/link';
import PlaylistsLibrary from '@/components/PlaylistsLibrary';

export const metadata = { title: 'Playlists — Guitar Companion' };

export default function PlaylistsPage() {
  return (
    <main style={{ minHeight: '100vh' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--gold-border)',
        background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-base) 100%)',
        padding: 'clamp(28px, 5vw, 48px) clamp(20px, 4vw, 48px)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link href="/" style={{
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: '0.75rem', letterSpacing: '0.3em', textTransform: 'uppercase',
            color: 'var(--cream-muted)', textDecoration: 'none',
            padding: '8px 0', minHeight: '44px', display: 'flex', alignItems: 'center',
          }}>
            &larr; Home
          </Link>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.55rem', letterSpacing: '0.5em', color: 'var(--gold-dim)', textTransform: 'uppercase', fontFamily: 'var(--font-cormorant, Georgia, serif)', marginBottom: '4px' }}>
              Your Sets
            </div>
            <h1 style={{
              fontFamily: 'var(--font-cormorant, Georgia, serif)',
              fontSize: 'clamp(1.6rem, 4vw, 2.6rem)',
              fontWeight: 600, letterSpacing: '0.06em',
              color: 'var(--gold-bright)', margin: 0,
              textShadow: '0 0 40px rgba(232,192,64,0.15)',
            }}>
              Playlists
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: 'clamp(32px, 5vw, 64px) clamp(16px, 4vw, 48px)' }}>
        <PlaylistsLibrary />
      </div>
    </main>
  );
}
