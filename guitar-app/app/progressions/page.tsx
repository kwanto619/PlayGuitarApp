import Link from 'next/link';
import ProgressionBuilder from '@/components/ProgressionBuilder';

export const metadata = { title: 'Chord Progressions — Guitar Companion' };

export default function ProgressionsPage() {
  return (
    <main style={{ minHeight: '100vh' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-base) 100%)',
        borderBottom: '1px solid var(--gold-border)',
        padding: '0 clamp(20px, 4vw, 48px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '60px',
      }}>
        <Link href="/" style={{
          padding: '8px 18px', minHeight: '44px',
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
          fontSize: '0.65rem', letterSpacing: '0.45em',
          textTransform: 'uppercase', color: 'var(--gold-dim)',
        }}>
          ♩ Progressions
        </span>
      </div>

      <div style={{
        maxWidth: '900px', margin: '0 auto',
        padding: 'clamp(40px, 7vw, 80px) clamp(20px, 4vw, 48px)',
      }}>
        <ProgressionBuilder />
      </div>
    </main>
  );
}
