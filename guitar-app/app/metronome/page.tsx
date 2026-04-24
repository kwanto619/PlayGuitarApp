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
        maxWidth: '680px', margin: '0 auto',
        padding: 'clamp(36px, 6vw, 72px) clamp(16px, 3vw, 40px)',
      }}>
        <Metronome initialBpm={initialBpm} />
      </div>
    </main>
  );
}
