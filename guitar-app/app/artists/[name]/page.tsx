'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { Song } from '@/types';
import { loadSongs } from '@/lib/storage';
import { SongCard } from '@/components/SongsLibrary';

export default function ArtistPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const artistName = decodeURIComponent(name);
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSongs().then((all) => {
      setSongs(all.filter((s) => s.artist.trim().toLowerCase() === artistName.trim().toLowerCase()));
      setLoading(false);
    });
  }, [artistName]);

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{
        maxWidth: '1280px', margin: '0 auto',
        padding: 'clamp(32px, 5vw, 64px) clamp(16px, 3vw, 40px)',
      }}>
        <button
          onClick={() => router.push('/songs')}
          style={{
            padding: '8px 18px', minHeight: '44px', cursor: 'pointer',
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: '0.9rem', fontWeight: 500, letterSpacing: '0.18em',
            textTransform: 'uppercase',
            border: '1px solid var(--gold-border-mid)',
            background: 'transparent', color: 'var(--cream-muted)',
            transition: 'all 0.15s', marginBottom: '28px',
          }}
        >
          ← All Songs
        </button>

        <div style={{
          fontSize: '0.62rem', letterSpacing: '0.4em', textTransform: 'uppercase',
          color: 'var(--gold-dim)', fontFamily: 'var(--font-cormorant, Georgia, serif)',
          marginBottom: '6px',
        }}>
          Artist
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '32px', flexWrap: 'wrap' }}>
          <h1 style={{
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 600,
            letterSpacing: '0.03em', color: 'var(--gold-bright)', margin: 0,
          }}>
            {artistName}
          </h1>
          {!loading && (
            <span style={{ fontSize: '0.8rem', letterSpacing: '0.2em', color: 'var(--cream-muted)', textTransform: 'uppercase' }}>
              {songs.length} {songs.length === 1 ? 'song' : 'songs'}
            </span>
          )}
        </div>

        {loading ? (
          <div style={{
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: '1.1rem', letterSpacing: '0.25em', textTransform: 'uppercase',
            color: 'var(--cream-muted)', padding: '48px 0', textAlign: 'center',
          }}>
            Loading…
          </div>
        ) : songs.length === 0 ? (
          <div style={{
            border: '1px solid var(--gold-border)', background: 'var(--bg-surface)',
            padding: '48px 24px', textAlign: 'center',
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: '1.3rem', color: 'var(--cream-muted)', letterSpacing: '0.05em',
          }}>
            No songs found for this artist.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {songs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                onClick={() => router.push(`/songs/${song.id}?fromArtist=${encodeURIComponent(artistName)}`)}
                showRating
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
