import Tuner from '@/components/Tuner';

export default function TunerPage() {
  return (
    <div className="tuner-page-root" style={{
      height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex', justifyContent: 'center',
        padding: 'clamp(12px, 2vw, 24px) clamp(12px, 3vw, 32px)',
      }}>
        <div style={{ width: '100%', maxWidth: '620px', display: 'flex' }}>
          <Tuner />
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .tuner-page-root {
            height: calc(100dvh - 58px);
          }
        }
      `}</style>
    </div>
  );
}
