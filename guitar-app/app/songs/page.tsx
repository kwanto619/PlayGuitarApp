import { Suspense } from 'react';
import SongsLibrary from '@/components/SongsLibrary';

export default function SongsPage() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{
        maxWidth: '1280px', margin: '0 auto',
        padding: 'clamp(32px, 5vw, 64px) clamp(16px, 3vw, 40px)',
      }}>
        <Suspense>
          <SongsLibrary />
        </Suspense>
      </div>
    </div>
  );
}
