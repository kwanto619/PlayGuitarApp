'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Song } from '@/types';
import { loadSongs } from '@/lib/storage';
import MiniSongCard from './MiniSongCard';
import { sectionLabel } from './ui';

/** Deterministic shuffle so a song page shows the same suggestions on
 *  every visit (seeded by the song id). */
function seededOrder<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
  return items
    .map((x) => ({ x, r: rnd() }))
    .sort((a, b) => a.r - b.r)
    .map((o) => o.x);
}

/**
 * "See also" strip at the end of a song page + related artists:
 *   1. other songs by the same artist,
 *   2. songs sharing chords with this one,
 *   3. other songs in the same language.
 */
export default function SongSuggestions({ song, limit = 8 }: { song: Song; limit?: number }) {
  const [all, setAll] = useState<Song[]>([]);

  useEffect(() => { loadSongs().then(setAll); }, []);

  const picks = useMemo(() => {
    const others = all.filter((s) => s.id !== song.id);
    const norm = (a: string) => a.trim().toLowerCase();
    const sameArtist = others.filter((s) => norm(s.artist) === norm(song.artist));
    const chordSet = new Set(song.chords.map((c) => c.toLowerCase()));
    const shareChords = others.filter((s) =>
      norm(s.artist) !== norm(song.artist) &&
      s.chords.some((c) => chordSet.has(c.toLowerCase()))
    );
    const sameLang = others.filter((s) =>
      s.language === song.language && norm(s.artist) !== norm(song.artist) && !shareChords.includes(s)
    );

    const out: Song[] = [];
    const seen = new Set<string>();
    const push = (list: Song[], max: number) => {
      for (const s of seededOrder(list, song.id)) {
        if (out.length >= limit || out.filter((o) => list.includes(o)).length >= max) break;
        if (!seen.has(s.id)) { seen.add(s.id); out.push(s); }
      }
    };
    push(sameArtist, 3);
    push(shareChords, limit);
    push(sameLang, limit);
    if (out.length < limit) push(others.filter((s) => !seen.has(s.id)), limit);
    return out;
  }, [all, song, limit]);

  const relatedArtists = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const s of picks) {
      const key = s.artist.trim().toLowerCase();
      if (key === song.artist.trim().toLowerCase() || seen.has(key)) continue;
      seen.add(key); list.push(s.artist);
      if (list.length >= 6) break;
    }
    return list;
  }, [picks, song.artist]);

  if (picks.length === 0) return null;

  return (
    <section style={{ marginTop: '56px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <h3 style={{
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: '1.5rem', fontWeight: 600, letterSpacing: '0.03em',
          color: 'var(--gold-bright)', margin: 0,
        }}>
          See also
        </h3>
        <Link href={`/artists/${encodeURIComponent(song.artist)}`} style={{
          fontSize: '0.74rem', letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'var(--gold-bright)', textDecoration: 'none',
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
        }}>
          More by {song.artist} →
        </Link>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))',
        gap: '12px',
      }}>
        {picks.map((s) => <MiniSongCard key={s.id} song={s} />)}
      </div>

      {relatedArtists.length > 0 && (
        <div style={{ marginTop: '28px' }}>
          <div style={sectionLabel}>Related artists</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {[song.artist, ...relatedArtists].map((a) => (
              <Link key={a} href={`/artists/${encodeURIComponent(a)}`} style={{
                padding: '8px 14px', minHeight: '40px', display: 'inline-flex', alignItems: 'center',
                border: '1px solid var(--gold-border-mid)',
                background: 'rgba(13,148,136,0.06)', color: 'var(--cream-soft)',
                fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.9rem',
                textDecoration: 'none', borderRadius: '8px',
              }}>
                {a}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
