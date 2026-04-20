'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Song } from '@/types';
import { loadFavoriteSongs } from '@/lib/storage';
import FavoriteButton from '@/components/FavoriteButton';
import AuthRequired from '@/components/AuthRequired';

export default function FavoritesPage() {
  const [songs,   setSongs]   = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadFavoriteSongs().then((s) => { setSongs(s); setLoading(false); }); }, []);

  return (
    <AuthRequired feature="Favorites">
    <div style={{ minHeight: '100vh' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-base) 100%)',
        borderBottom: '1px solid var(--gold-border)',
        padding: '0 clamp(20px, 4vw, 48px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px',
      }}>
        <Link href="/" style={topBtn}>← Home</Link>
        <span style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.78rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--cream-soft)' }}>
          ♥ Favorites
        </span>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: 'clamp(32px, 5vw, 64px) clamp(16px, 4vw, 48px)' }}>
        {loading ? (
          <div style={centerBox}>Loading…</div>
        ) : songs.length === 0 ? (
          <div style={centerBox}>
            No favorites yet. Tap the heart on any song to add it here.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {songs.map((s) => (
              <Link key={s.id} href={`/songs/${s.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  position: 'relative',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--gold-border)',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, transform 0.15s',
                }}>
                  <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                    <FavoriteButton songId={s.id} size="sm" />
                  </div>
                  <h4 style={{
                    fontFamily: 'var(--font-cormorant, Georgia, serif)',
                    fontSize: '1.3rem', fontWeight: 600, color: 'var(--gold)',
                    margin: '0 0 4px', paddingRight: '32px',
                  }}>{s.title}</h4>
                  <p style={{
                    fontFamily: 'var(--font-cormorant, Georgia, serif)',
                    fontSize: '0.95rem', fontStyle: 'italic',
                    color: 'var(--cream-muted)', margin: '0 0 8px',
                  }}>{s.artist}</p>
                  {s.uploaderUsername && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--cream-muted)', letterSpacing: '0.08em' }}>
                      @{s.uploaderUsername}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
    </AuthRequired>
  );
}

const topBtn: React.CSSProperties = {
  padding: '8px 18px', fontFamily: 'var(--font-cormorant, Georgia, serif)',
  fontSize: '0.9rem', fontWeight: 500, letterSpacing: '0.18em',
  textTransform: 'uppercase', cursor: 'pointer',
  border: '1px solid var(--gold-border-mid)',
  background: 'transparent', color: 'var(--cream-muted)',
  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px',
};

const centerBox: React.CSSProperties = {
  textAlign: 'center', padding: '80px 20px',
  fontFamily: 'var(--font-cormorant, Georgia, serif)',
  color: 'var(--cream-muted)', fontSize: '1.1rem', letterSpacing: '0.05em',
  border: '1px solid var(--gold-border)', background: 'var(--bg-surface)',
};
