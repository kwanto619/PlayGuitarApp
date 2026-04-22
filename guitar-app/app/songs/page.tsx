import { Suspense } from 'react';
import SongsLibrary from '@/components/SongsLibrary';
import SongsFlyoutNav from '@/components/SongsFlyoutNav';

export default function SongsPage() {
  return (
    <div className="songs-page-shell" style={{ minHeight: '100vh' }}>
      <SongsFlyoutNav />

      <div className="songs-page-main">
        <div style={{
          maxWidth: '1280px', margin: '0 auto',
          padding: 'clamp(40px, 6vw, 72px) clamp(20px, 4vw, 48px)',
        }}>
          <Suspense>
            <SongsLibrary />
          </Suspense>
        </div>
      </div>

      <style>{`
        .songs-page-main {
          margin-left: 260px;
          min-height: 100vh;
        }
        @media (max-width: 900px) {
          .songs-page-main {
            margin-left: 0;
            padding-top: 60px;
          }
        }
      `}</style>
    </div>
  );
}
