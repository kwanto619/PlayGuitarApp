import Link from 'next/link';
import Metronome from '@/components/Metronome';

export const metadata = { title: 'Metronome — Guitar Companion' };

export default async function MetronomePage({
  searchParams,
}: {
  searchParams: Promise<{ bpm?: string }>;
}) {
  const { bpm: bpmStr } = await searchParams;
  const initialBpm = bpmStr ? Math.min(240, Math.max(40, parseInt(bpmStr, 10) || 120)) : 120;

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
          ♩ Metronome
        </span>
      </div>

      <div style={{
        maxWidth: '680px', margin: '0 auto',
        padding: 'clamp(48px, 8vw, 96px) clamp(20px, 4vw, 48px)',
      }}>
        <Metronome initialBpm={initialBpm} />
      </div>
    </main>
  );
}
