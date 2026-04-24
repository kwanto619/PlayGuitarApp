import ProgressionBuilder from '@/components/ProgressionBuilder';

export const metadata = { title: 'Chord Progressions — Guitar Companion' };

export default function ProgressionsPage() {
  return (
    <main className="prog-page-root" style={{
      height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div className="prog-page-content" style={{
        flex: 1, minHeight: 0,
        padding: 'clamp(14px, 2vw, 24px) clamp(16px, 3vw, 40px) clamp(14px, 2vw, 24px)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ flex: 1, minHeight: 0, width: '100%', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
          <ProgressionBuilder />
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .prog-page-root {
            height: auto !important;
            min-height: calc(100dvh - 58px);
            overflow: auto !important;
          }
        }
      `}</style>
    </main>
  );
}
