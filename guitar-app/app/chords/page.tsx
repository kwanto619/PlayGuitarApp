import Link from 'next/link';
import ChordsLibrary from '@/components/ChordsLibrary';

export default function ChordsPage() {
  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ── Top bar ── */}
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
          ♯ Chord Library
        </span>
      </div>

      {/* ── Content ── */}
      <div style={{
        maxWidth: '1280px', margin: '0 auto',
        padding: 'clamp(40px, 6vw, 72px) clamp(20px, 4vw, 48px)',
      }}>
        <ChordsLibrary />
      </div>
    </div>
  );
}
