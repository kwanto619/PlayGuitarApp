'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Playlist, Song } from '@/types';
import { loadProfileById } from '@/lib/storage';

type SongRow = {
  id: string; title: string; artist: string;
  chords: string[]; lyrics: string | null; notes: string | null;
  language: string; bpm: number | null; rating: number | null;
  youtube_video_id: string | null;
  user_id: string | null; created_at?: string | null;
};

function mapSong(s: SongRow): Song {
  return {
    id: s.id, title: s.title, artist: s.artist,
    chords: s.chords,
    lyrics: s.lyrics || undefined,
    notes: s.notes || undefined,
    language: s.language as 'greek' | 'english',
    bpm: s.bpm ?? undefined, rating: s.rating ?? undefined,
    youtubeVideoId: s.youtube_video_id || undefined,
    userId: s.user_id ?? undefined,
    createdAt: s.created_at ?? undefined,
  };
}

export default function PlaylistViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [songs,    setSongs]    = useState<Song[]>([]);
  const [owner,    setOwner]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: p } = await supabase.from('playlists').select('*').eq('id', id).maybeSingle();
      if (!p) { setNotFound(true); setLoading(false); return; }
      const pl: Playlist = {
        id: p.id, name: p.name, song_ids: p.song_ids ?? [],
        userId: p.user_id ?? undefined, isPublic: p.is_public ?? undefined,
      };
      setPlaylist(pl);
      if (pl.userId) {
        const prof = await loadProfileById(pl.userId);
        setOwner(prof?.username ?? null);
      }
      if (pl.song_ids.length > 0) {
        const { data: ss } = await supabase.from('songs').select('*').in('id', pl.song_ids);
        const byId = new Map((ss ?? []).map((s) => [s.id, mapSong(s as SongRow)]));
        setSongs(pl.song_ids.map((sid) => byId.get(sid)).filter((x): x is Song => !!x));
      }
      setLoading(false);
    })();
  }, [id]);

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-base) 100%)',
        borderBottom: '1px solid var(--gold-border)',
        padding: '0 clamp(20px, 4vw, 48px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px',
      }}>
        <Link href={owner ? `/u/${owner}` : '/'} style={topBtn}>
          ← {owner ? `@${owner}` : 'Back'}
        </Link>
        <span style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.78rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--cream-soft)' }}>
          ♪ Playlist
        </span>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: 'clamp(32px, 5vw, 64px) clamp(16px, 4vw, 48px)' }}>
        {loading ? (
          <div style={centerBox}>Loading…</div>
        ) : notFound || !playlist ? (
          <div style={centerBox}>Playlist not found.</div>
        ) : (
          <>
            <div style={{ marginBottom: '28px' }}>
              {owner && (
                <div style={{ fontSize: '0.68rem', color: 'var(--gold-dim)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  By <Link href={`/u/${owner}`} style={{ color: 'var(--gold-bright)', textDecoration: 'none' }}>@{owner}</Link>
                </div>
              )}
              <h1 style={{
                fontFamily: 'var(--font-cormorant, Georgia, serif)',
                fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 600,
                color: 'var(--gold-bright)', margin: '0 0 6px',
              }}>{playlist.name}</h1>
              <div style={{ color: 'var(--cream-muted)', fontSize: '0.85rem', letterSpacing: '0.1em' }}>
                {songs.length} {songs.length === 1 ? 'song' : 'songs'}
              </div>
            </div>

            {songs.length === 0 ? (
              <div style={centerBox}>This playlist is empty.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {songs.map((s, i) => (
                  <Link key={s.id} href={`/songs/${s.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      padding: '14px 18px',
                      border: '1px solid var(--gold-border)',
                      background: 'var(--bg-card)',
                      display: 'flex', alignItems: 'center', gap: '14px',
                    }}>
                      <span style={{
                        minWidth: '28px',
                        color: 'var(--cream-muted)', fontSize: '0.85rem',
                        fontFamily: 'var(--font-ibm-mono, monospace)',
                      }}>{i + 1}.</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: 'var(--font-cormorant, Georgia, serif)',
                          fontSize: '1.1rem', fontWeight: 600, color: 'var(--gold)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{s.title}</div>
                        <div style={{
                          fontFamily: 'var(--font-cormorant, Georgia, serif)',
                          fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--cream-muted)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{s.artist}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
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
  textAlign: 'center', padding: '60px 20px',
  fontFamily: 'var(--font-cormorant, Georgia, serif)',
  color: 'var(--cream-muted)', fontSize: '1.05rem', letterSpacing: '0.05em',
  border: '1px solid var(--gold-border)', background: 'var(--bg-surface)',
};
