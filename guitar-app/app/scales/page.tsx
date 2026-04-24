import ScalesBoard from '@/components/ScalesBoard';

export const metadata = { title: 'Pentatonic Scales — Songcord' };

export default function ScalesPage() {
  return (
    <main style={{ minHeight: '100vh' }}>
      <div style={{
        maxWidth: '1400px', margin: '0 auto',
        padding: 'clamp(28px, 4vw, 56px) clamp(16px, 3vw, 40px)',
      }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            fontSize: '0.6rem', letterSpacing: '0.5em', color: 'var(--gold-dim)',
            textTransform: 'uppercase', marginBottom: '6px',
          }}>
            Lead Guitar
          </div>
          <h1 style={{
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: 'clamp(1.8rem, 3.2vw, 2.4rem)',
            fontWeight: 700, letterSpacing: '0.02em', margin: 0,
            color: 'var(--gold-bright)',
          }}>
            Pentatonic Scales
          </h1>
          <p style={{
            marginTop: '6px', maxWidth: '720px',
            fontSize: '0.92rem', color: 'var(--cream-soft)', lineHeight: 1.55,
          }}>
            Every note of the pentatonic (5-note) scale across the first 15 frets.
            Click any dot to hear the note. Switch between Minor, Major, and the blues additions.
          </p>
        </div>

        <ScalesBoard />
      </div>
    </main>
  );
}
