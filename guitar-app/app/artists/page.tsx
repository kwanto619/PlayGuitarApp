'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Song } from '@/types';
import { loadSongs, loadPopularSongs } from '@/lib/storage';
import { sectionLabel, segBtn, segWrap } from '@/components/ui';

const LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const GREEK = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ'.split('');

interface ArtistEntry {
  key: string;      // normalized name (grouping key)
  name: string;     // display name
  songs: Song[];
  views: number;    // all-time opens across the artist's songs
  letter: string;   // index letter ('#' for digits/symbols)
  greek: boolean;
}

/** Upper-case first letter with accents stripped (Ά → Α, É → E). */
function indexLetter(name: string): { letter: string; greek: boolean } {
  const first = name.trim().normalize('NFD').replace(/[̀-ͯ]/g, '')[0]?.toUpperCase() ?? '#';
  if (/[A-Z]/.test(first)) return { letter: first, greek: false };
  if (/[Α-Ω]/.test(first)) return { letter: first, greek: true };
  return { letter: '#', greek: false };
}

type SortKey = 'popular' | 'name' | 'songs';

export default function ArtistsPage() {
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [views, setViews] = useState<Record<string, number>>({});
  const [letter, setLetter] = useState<string>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('popular');

  useEffect(() => {
    loadSongs().then(setSongs);
    loadPopularSongs(0, 1000).then((r) => {
      const m: Record<string, number> = {};
      r.forEach((x) => { m[x.songId] = x.views; });
      setViews(m);
    });
  }, []);

  const artists: ArtistEntry[] = useMemo(() => {
    if (!songs) return [];
    const map = new Map<string, ArtistEntry>();
    for (const s of songs) {
      const key = s.artist.trim().toLowerCase();
      if (!key) continue;
      const cur = map.get(key);
      if (cur) { cur.songs.push(s); cur.views += views[s.id] ?? 0; }
      else map.set(key, { key, name: s.artist.trim(), songs: [s], views: views[s.id] ?? 0, ...indexLetter(s.artist) });
    }
    return [...map.values()];
  }, [songs, views]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    artists.forEach((a) => { c[a.letter] = (c[a.letter] ?? 0) + 1; });
    return c;
  }, [artists]);

  const hasGreek = artists.some((a) => a.greek);
  const hasLatin = artists.some((a) => !a.greek && a.letter !== '#');

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return artists
      .filter((a) => letter === 'all' || a.letter === letter)
      .filter((a) => !needle || a.name.toLowerCase().includes(needle))
      .sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name, ['el', 'en']);
        if (sort === 'songs') return b.songs.length - a.songs.length || a.name.localeCompare(b.name, ['el', 'en']);
        return b.views - a.views || b.songs.length - a.songs.length || a.name.localeCompare(b.name, ['el', 'en']);
      });
  }, [artists, letter, q, sort]);

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: 'clamp(32px, 5vw, 64px) clamp(16px, 3vw, 40px)' }}>
        <div style={sectionLabel}>Browse</div>
        <h1 style={{
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 600, letterSpacing: '0.03em',
          color: 'var(--gold-bright)', margin: '0 0 6px',
        }}>
          Artists
        </h1>
        <p style={{ margin: '0 0 24px', color: 'var(--cream-muted)', fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '1rem' }}>
          {songs ? `${artists.length} artists · ${songs.length} songs` : 'Loading…'} — browse alphabetically or by popularity.
        </p>

        {/* Letter index */}
        <div className="artist-letters" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
          <LetterBtn active={letter === 'all'} onClick={() => setLetter('all')} label="All" />
          <LetterBtn active={letter === '#'} onClick={() => setLetter('#')} label="#" disabled={!counts['#']} />
          {hasLatin && LATIN.map((l) => (
            <LetterBtn key={l} label={l} active={letter === l} disabled={!counts[l]} onClick={() => setLetter(l)} />
          ))}
          {hasGreek && hasLatin && <span style={{ width: '100%', height: 0 }} />}
          {hasGreek && GREEK.map((l) => (
            <LetterBtn key={l} label={l} active={letter === l} disabled={!counts[l]} onClick={() => setLetter(l)} />
          ))}
        </div>

        {/* Search + sort */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '28px' }}>
          <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '520px' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gold-dim)', pointerEvents: 'none' }}>⌕</span>
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={letter === 'all' ? 'Search artists…' : `Search in "${letter}"…`}
              style={{
                width: '100%', padding: '11px 16px 11px 38px', boxSizing: 'border-box',
                fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '1rem',
                background: 'var(--bg-input)', border: '1px solid var(--gold-border-mid)',
                color: 'var(--cream)', outline: 'none',
              }}
            />
          </div>
          <div style={{ ...segWrap, marginLeft: 'auto' }}>
            {([['popular', 'Popularity'], ['songs', 'Most songs'], ['name', 'A → Ω']] as [SortKey, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setSort(k)} style={segBtn(sort === k)}>{l}</button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {!songs ? (
          <Empty>Loading…</Empty>
        ) : visible.length === 0 ? (
          <Empty>No artists match.</Empty>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: '12px' }}>
            {visible.map((a) => <ArtistCard key={a.key} a={a} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function LetterBtn({ label, active, disabled, onClick }: { label: string; active: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        minWidth: '36px', height: '36px', padding: '0 10px', cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.82rem', fontWeight: active ? 700 : 500,
        letterSpacing: '0.06em',
        border: `1px solid ${active ? 'var(--gold)' : 'var(--gold-border)'}`,
        background: active ? 'rgba(0,196,180,0.15)' : 'var(--bg-surface)',
        color: active ? 'var(--gold-bright)' : disabled ? 'var(--cream-muted)' : 'var(--cream-soft)',
        opacity: disabled ? 0.35 : 1, transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

function ArtistCard({ a }: { a: ArtistEntry }) {
  const [hovered, setHovered] = useState(false);
  const initials = a.name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  return (
    <Link
      href={`/artists/${encodeURIComponent(a.name)}`}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0,
        padding: '12px 14px', textDecoration: 'none',
        background: 'var(--bg-card)',
        border: `1px solid ${hovered ? 'var(--gold-border-mid)' : 'var(--gold-border)'}`,
        boxShadow: hovered ? '0 8px 28px rgba(23,58,54,0.06)' : '0 2px 10px rgba(23,58,54,0.035)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
      }}
    >
      <span style={{
        width: '48px', height: '48px', flex: '0 0 auto', borderRadius: '10px',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-cormorant, Georgia, serif)', fontWeight: 700, fontSize: '1rem',
        color: '#fff', background: 'linear-gradient(135deg, var(--gold), var(--gold-bright))',
        letterSpacing: '0.04em',
      }}>
        {initials}
      </span>
      <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <span style={{
          fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '1.05rem', fontWeight: 600,
          color: hovered ? 'var(--gold-bright)' : 'var(--cream)', letterSpacing: '0.02em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color 0.15s',
        }}>
          {a.name}
        </span>
        <span style={{ fontSize: '0.74rem', letterSpacing: '0.1em', color: 'var(--cream-muted)', textTransform: 'uppercase' }}>
          {a.songs.length} {a.songs.length === 1 ? 'song' : 'songs'}{a.views > 0 && ` · ${a.views.toLocaleString()} plays`}
        </span>
      </span>
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      border: '1px solid var(--gold-border)', background: 'var(--bg-surface)',
      padding: '48px 24px', textAlign: 'center',
      fontFamily: 'var(--font-cormorant, Georgia, serif)',
      fontSize: '1.1rem', color: 'var(--cream-muted)', letterSpacing: '0.05em',
    }}>
      {children}
    </div>
  );
}
