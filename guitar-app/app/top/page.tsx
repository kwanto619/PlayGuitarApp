'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Song } from '@/types';
import { loadSongs, loadPopularSongs, type PopularWindow } from '@/lib/storage';
import { useRatings } from '@/lib/useRatings';
import Flag from '@/components/Flag';
import { sectionLabel, segBtn, segWrap } from '@/components/ui';

type Tab = 'songs' | 'artists';
const WINDOWS: { value: PopularWindow; label: string }[] = [
  { value: 7,  label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 0,  label: 'All time' },
];

interface RankedSong { song: Song; views: number }
interface RankedArtist { name: string; views: number; songs: number; top: Song }

function TopInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialWin = Number(sp.get('days') ?? 30);
  const [win, setWin] = useState<PopularWindow>(initialWin === 7 || initialWin === 0 ? initialWin : 30);
  const [tab, setTab] = useState<Tab>(sp.get('tab') === 'artists' ? 'artists' : 'songs');
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [ranks, setRanks] = useState<Record<PopularWindow, { songId: string; views: number }[] | null>>({ 7: null, 30: null, 0: null });
  const { summaryOf } = useRatings();

  useEffect(() => { loadSongs().then(setSongs); }, []);

  useEffect(() => {
    if (ranks[win]) return;
    loadPopularSongs(win, 100).then((r) => setRanks((prev) => ({ ...prev, [win]: r })));
  }, [win, ranks]);

  // Keep URL shareable (/top?days=7&tab=artists).
  useEffect(() => {
    const p = new URLSearchParams();
    if (win !== 30) p.set('days', String(win));
    if (tab !== 'songs') p.set('tab', tab);
    const qs = p.toString();
    router.replace(qs ? `/top?${qs}` : '/top', { scroll: false });
  }, [win, tab, router]);

  const byId = useMemo(() => new Map((songs ?? []).map((s) => [s.id, s])), [songs]);

  const rankedSongs: RankedSong[] = useMemo(() => {
    const r = ranks[win] ?? [];
    return r.map((x) => ({ song: byId.get(x.songId)!, views: x.views })).filter((x) => !!x.song).slice(0, 50);
  }, [ranks, win, byId]);

  const rankedArtists: RankedArtist[] = useMemo(() => {
    const acc = new Map<string, RankedArtist>();
    for (const { song, views } of rankedSongs) {
      const key = song.artist.trim().toLowerCase();
      const cur = acc.get(key);
      if (cur) { cur.views += views; cur.songs += 1; }
      else acc.set(key, { name: song.artist.trim(), views, songs: 1, top: song });
    }
    return [...acc.values()].sort((a, b) => b.views - a.views || b.songs - a.songs).slice(0, 50);
  }, [rankedSongs]);

  const loading = ranks[win] === null || songs === null;

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: 'clamp(32px, 5vw, 64px) clamp(16px, 3vw, 40px)' }}>
        <div style={sectionLabel}>Community charts</div>
        <h1 style={{
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 600, letterSpacing: '0.03em',
          color: 'var(--gold-bright)', margin: '0 0 24px',
        }}>
          Most Popular
        </h1>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '28px' }}>
          <div style={segWrap} role="tablist" aria-label="Time window">
            {WINDOWS.map((w) => (
              <button key={w.value} role="tab" aria-selected={win === w.value} onClick={() => setWin(w.value)} style={segBtn(win === w.value)}>
                {w.label}
              </button>
            ))}
          </div>
          <div style={{ ...segWrap, marginLeft: 'auto' }} role="tablist" aria-label="Chart type">
            {(['songs', 'artists'] as Tab[]).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} style={{ ...segBtn(tab === t), minWidth: '110px' }}>
                {t === 'songs' ? 'Songs' : 'Artists'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <Empty>Loading…</Empty>
        ) : tab === 'songs' ? (
          rankedSongs.length === 0 ? (
            <Empty>No plays recorded {win === 0 ? 'yet' : `in the last ${win} days`}. Open a few songs and check back.</Empty>
          ) : (
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {rankedSongs.map(({ song, views }, i) => {
                const s = summaryOf(song.id);
                return (
                  <li key={song.id}>
                    <Link href={`/songs/${song.id}`} className="top-row" style={rowStyle}>
                      <RankBadge n={i + 1} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <Flag lang={song.language} style={{ width: '1.1em', height: '0.8em', flex: '0 0 auto' }} />
                          <span style={titleStyle}>{song.title}</span>
                        </div>
                        <span
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/artists/${encodeURIComponent(song.artist)}`); }}
                          style={artistStyle}
                          title={`All songs by ${song.artist}`}
                        >
                          {song.artist}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: '0 0 auto' }}>
                        <span style={statStyle}>
                          <span style={{ color: '#f5a623' }}>★</span> {s ? s.avg.toFixed(1) : '—'}
                          {s && <span style={{ color: 'var(--cream-muted)' }}> ({s.count})</span>}
                        </span>
                        <span style={statStyle} title="Opens">
                          <span style={{ color: 'var(--gold-dim)' }}>▶</span> {views.toLocaleString()}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )
        ) : rankedArtists.length === 0 ? (
          <Empty>No plays recorded {win === 0 ? 'yet' : `in the last ${win} days`}.</Empty>
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rankedArtists.map((a, i) => (
              <li key={a.name.toLowerCase()}>
                <Link href={`/artists/${encodeURIComponent(a.name)}`} className="top-row" style={rowStyle}>
                  <RankBadge n={i + 1} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span style={titleStyle}>{a.name}</span>
                    <span style={{ ...artistStyle, textDecoration: 'none', cursor: 'inherit' }}>
                      Most played: {a.top.title}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: '0 0 auto' }}>
                    <span style={statStyle}>{a.songs} {a.songs === 1 ? 'song' : 'songs'}</span>
                    <span style={statStyle} title="Opens">
                      <span style={{ color: 'var(--gold-dim)' }}>▶</span> {a.views.toLocaleString()}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>

      <style>{`
        .top-row:hover { border-color: var(--gold-border-mid) !important; box-shadow: 0 8px 28px rgba(23,58,54,0.06); transform: translateY(-1px); }
        @media (max-width: 560px) {
          .top-row { flex-wrap: wrap; }
          .top-row > div:last-child { flex-basis: 100%; padding-left: 50px; }
        }
      `}</style>
    </div>
  );
}

export default function TopPage() {
  return <Suspense><TopInner /></Suspense>;
}

function RankBadge({ n }: { n: number }) {
  const top = n <= 3;
  return (
    <span style={{
      width: '38px', height: '38px', flex: '0 0 auto',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-cormorant, Georgia, serif)',
      fontSize: n >= 10 ? '0.9rem' : '1.05rem', fontWeight: 700,
      color: top ? '#fff' : 'var(--gold-bright)',
      background: top ? 'var(--gold)' : 'rgba(13,148,136,0.1)',
      border: '1px solid var(--gold-border-mid)', borderRadius: '8px',
    }}>
      {n}
    </span>
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

const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '14px',
  padding: '12px 16px', textDecoration: 'none',
  background: 'var(--bg-card)', border: '1px solid var(--gold-border)',
  boxShadow: '0 2px 10px rgba(23,58,54,0.035)',
  transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
};
const titleStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-cormorant, Georgia, serif)',
  fontSize: '1.1rem', fontWeight: 600, color: 'var(--cream)', letterSpacing: '0.02em',
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
};
const artistStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-cormorant, Georgia, serif)',
  fontSize: '0.88rem', fontStyle: 'italic', color: 'var(--cream-muted)',
  textDecoration: 'underline', textDecorationColor: 'var(--gold-border-mid)', textUnderlineOffset: '3px',
  cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
};
const statStyle: React.CSSProperties = {
  fontSize: '0.82rem', color: 'var(--cream-soft)', whiteSpace: 'nowrap',
  fontFamily: 'var(--font-cormorant, Georgia, serif)',
};
