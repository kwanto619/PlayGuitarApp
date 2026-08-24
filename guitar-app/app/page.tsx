'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import CreateAccountBanner from '@/components/CreateAccountBanner';
import MiniSongCard from '@/components/MiniSongCard';
import { ghostLink, sectionLabel, sectionTitle } from '@/components/ui';
import { loadPopularSongs, loadRecentlyViewed, loadSongs } from '@/lib/storage';
import type { Song } from '@/types';

const AUTH_REQUIRED = new Set(['/playlists', '/favorites', '/feed']);

// ── Icons ────────────────────────────────────────────────────────────────────

function TunerIcon() {
  // Analog dial: semicircle arc + needle + ticks
  const cx = 40, cy = 56, R = 34;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const pt = (deg: number, r: number) => ({
    x: cx + r * Math.cos(toRad(deg)),
    y: cy + r * Math.sin(toRad(deg)),
  });
  const arcS = pt(210, R);
  const arcE = pt(330, R);
  const tip  = pt(263, 27); // needle tip — slightly left of centre

  return (
    <svg viewBox="0 0 80 68" width="88" height="75" fill="none" stroke="currentColor">
      {/* Arc track */}
      <path
        d={`M ${arcS.x.toFixed(1)} ${arcS.y.toFixed(1)} A ${R} ${R} 0 0 1 ${arcE.x.toFixed(1)} ${arcE.y.toFixed(1)}`}
        strokeWidth="2.5" strokeLinecap="round" opacity="0.35"
      />
      {/* Tick marks */}
      {[210, 240, 270, 300, 330].map((deg) => {
        const inner = pt(deg, R - 9);
        const outer = pt(deg, R);
        return (
          <line
            key={deg}
            x1={inner.x.toFixed(1)} y1={inner.y.toFixed(1)}
            x2={outer.x.toFixed(1)} y2={outer.y.toFixed(1)}
            strokeWidth={deg === 270 ? 2 : 1.5}
            opacity={deg === 270 ? 0.75 : 0.35}
          />
        );
      })}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={tip.x.toFixed(1)} y2={tip.y.toFixed(1)} strokeWidth="2.5" strokeLinecap="round" />
      {/* Pivot */}
      <circle cx={cx} cy={cy} r="4" fill="currentColor" stroke="none" />
      {/* Label */}
      <text
        x={cx} y="67" textAnchor="middle"
        fontFamily="Georgia, serif" fontSize="7" letterSpacing="3"
        fill="currentColor" stroke="none" opacity="0.5"
      >
        440 Hz
      </text>
    </svg>
  );
}

function ChordsIcon() {
  // Simplified guitar fretboard — Am chord shape
  const strings = [8, 17, 26, 35, 44, 53];   // x positions (6 strings)
  const frets   = [16, 27, 38, 49, 60];        // y positions (5 frets)
  const dots    = [                             // Am: x,o,2,2,1,o
    { x: 26, y: (frets[1] + frets[2]) / 2 },   // string 4, fret 2
    { x: 35, y: (frets[1] + frets[2]) / 2 },   // string 3, fret 2
    { x: 44, y: (frets[0] + frets[1]) / 2 },   // string 2, fret 1
  ];

  return (
    <svg viewBox="0 0 62 78" width="62" height="78" fill="none" stroke="currentColor">
      {/* Strings */}
      {strings.map((x) => (
        <line key={x} x1={x} y1={frets[0]} x2={x} y2={frets[4]} strokeWidth="1.2" opacity="0.4" />
      ))}
      {/* Nut */}
      <line x1={strings[0]} y1={frets[0]} x2={strings[5]} y2={frets[0]} strokeWidth="3.5" strokeLinecap="round" opacity="0.8" />
      {/* Frets */}
      {frets.slice(1).map((y) => (
        <line key={y} x1={strings[0]} y1={y} x2={strings[5]} y2={y} strokeWidth="1.2" opacity="0.3" />
      ))}
      {/* Finger dots */}
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r="5" fill="currentColor" stroke="none" opacity="0.9" />
      ))}
      {/* Open string markers */}
      {[strings[1], strings[5]].map((x) => (
        <circle key={x} cx={x} cy={frets[0] - 8} r="3.5" strokeWidth="1.5" opacity="0.6" />
      ))}
      {/* Muted string (X) */}
      <line x1={strings[0] - 4} y1={frets[0] - 12} x2={strings[0] + 4} y2={frets[0] - 4} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1={strings[0] + 4} y1={frets[0] - 12} x2={strings[0] - 4} y2={frets[0] - 4} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

function SongsIcon() {
  // Two beamed eighth notes
  return (
    <svg viewBox="0 0 80 72" width="80" height="72" fill="none" stroke="currentColor">
      {/* Note 1 head */}
      <ellipse
        cx="20" cy="57" rx="9" ry="6.5"
        transform="rotate(-22 20 57)"
        fill="currentColor" stroke="none" opacity="0.9"
      />
      {/* Note 2 head */}
      <ellipse
        cx="52" cy="51" rx="9" ry="6.5"
        transform="rotate(-22 52 51)"
        fill="currentColor" stroke="none" opacity="0.9"
      />
      {/* Stems */}
      <line x1="27.5" y1="53" x2="27.5" y2="26" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="59.5" y1="47" x2="59.5" y2="26" strokeWidth="2.5" strokeLinecap="round" />
      {/* Beams */}
      <line x1="27.5" y1="26" x2="59.5" y2="26" strokeWidth="5" strokeLinecap="round" />
      <line x1="27.5" y1="33" x2="59.5" y2="33" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function MetronomeIcon() {
  // Pendulum metronome shape
  const cx = 40, cy = 62;
  return (
    <svg viewBox="0 0 80 80" width="80" height="80" fill="none" stroke="currentColor">
      {/* Base trapezoid */}
      <path d="M18 70 L28 30 L52 30 L62 70Z" strokeWidth="2" strokeLinejoin="round" opacity="0.6" />
      {/* Pendulum rod */}
      <line x1={cx} y1={cy} x2="55" y2="16" strokeWidth="2.5" strokeLinecap="round" />
      {/* Weight on rod */}
      <rect x="49" y="12" width="12" height="8" rx="2" fill="currentColor" stroke="none" opacity="0.85" />
      {/* Pivot dot */}
      <circle cx={cx} cy={cy} r="3.5" fill="currentColor" stroke="none" />
      {/* Tick marks at base */}
      <line x1="24" y1="70" x2="56" y2="70" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      {/* BPM label */}
      <text x={cx} y="77" textAnchor="middle" fontSize="6" letterSpacing="2"
            fill="currentColor" stroke="none" opacity="0.4" fontFamily="monospace">BPM</text>
    </svg>
  );
}

function ProgressionsIcon() {
  // Four chord boxes connected by arrow
  return (
    <svg viewBox="0 0 80 72" width="80" height="72" fill="none" stroke="currentColor">
      {/* Chord boxes */}
      {[8, 26, 44, 62].map((x, i) => (
        <rect key={i} x={x} y="24" width="14" height="20" rx="2"
              strokeWidth="1.8" opacity={i === 0 ? 0.9 : 0.6 - i * 0.05} />
      ))}
      {/* Chord labels inside */}
      {['Am','F','C','G'].map((c, i) => (
        <text key={i} x={15 + i * 18} y="37" textAnchor="middle"
              fontSize="5.5" letterSpacing="0.5" fill="currentColor" stroke="none" opacity="0.85"
              fontFamily="monospace">
          {c}
        </text>
      ))}
      {/* Connecting arrows */}
      {[22, 40, 58].map((x) => (
        <line key={x} x1={x} y1="34" x2={x + 4} y2="34" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      ))}
      {/* Loop arc */}
      <path d="M8 44 Q40 60 72 44" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" strokeDasharray="3 2" />
      <polygon points="68,41 72,44 68,47" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}

function FavoritesIcon() {
  return (
    <svg viewBox="0 0 80 72" width="80" height="72" fill="none" stroke="currentColor">
      <path d="M40 62 C20 50 10 38 10 26 C10 18 18 12 26 12 C32 12 36 15 40 20 C44 15 48 12 54 12 C62 12 70 18 70 26 C70 38 60 50 40 62Z"
        strokeWidth="2.5" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}

function FeedIcon() {
  return (
    <svg viewBox="0 0 80 72" width="80" height="72" fill="none" stroke="currentColor">
      <circle cx="16" cy="56" r="4" fill="currentColor" stroke="none" />
      <path d="M14 40 Q14 26 28 26" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M14 20 Q14 8 36 8 Q60 8 60 28" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
      <path d="M14 52 L56 52 L66 40 L66 24 L56 14" strokeWidth="0" />
      <line x1="30" y1="22" x2="66" y2="22" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
      <line x1="30" y1="34" x2="66" y2="34" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
      <line x1="30" y1="46" x2="54" y2="46" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

function PlaylistsIcon() {
  // Ordered list with a small music note accent
  return (
    <svg viewBox="0 0 80 72" width="80" height="72" fill="none" stroke="currentColor">
      {/* List lines */}
      <line x1="22" y1="20" x2="64" y2="20" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      <line x1="22" y1="36" x2="64" y2="36" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      <line x1="22" y1="52" x2="48" y2="52" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      {/* Bullet dots */}
      <circle cx="12" cy="20" r="3.5" fill="currentColor" stroke="none" opacity="0.7" />
      <circle cx="12" cy="36" r="3.5" fill="currentColor" stroke="none" opacity="0.7" />
      <circle cx="12" cy="52" r="3.5" fill="currentColor" stroke="none" opacity="0.7" />
      {/* Small note on last line */}
      <ellipse cx="61" cy="57" rx="5.5" ry="4" transform="rotate(-18 61 57)" fill="currentColor" stroke="none" opacity="0.85" />
      <line x1="65.2" y1="55.2" x2="65.2" y2="41" strokeWidth="2" strokeLinecap="round" />
      <line x1="65.2" y1="41" x2="71" y2="43.5" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
const cards = [
  {
    href:        '/songs',
    label:       'Songs',
    subtitle:    'Community library',
    description: 'Every song uploaded by any member. Hover chords for diagrams, view who uploaded each song.',
    Icon:        SongsIcon,
  },
  {
    href:        '/chords',
    label:       'Chord Library',
    subtitle:    'Reference & sound',
    description: 'Browse every chord shape, hear how it sounds, and study the finger positions.',
    Icon:        ChordsIcon,
  },
  {
    href:        '/playlists',
    label:       'Playlists',
    subtitle:    'Sets & setlists',
    description: 'Group songs into playlists for gigs, practice sessions, or any occasion.',
    Icon:        PlaylistsIcon,
  },
  {
    href:        '/favorites',
    label:       'Favorites',
    subtitle:    'Hearts you gave',
    description: 'Songs you marked with a heart — your personal shortlist across the whole library.',
    Icon:        FavoritesIcon,
  },
] as const;

function NavCard({ href, label, subtitle, description, Icon }: typeof cards[number]) {
  const [hovered, setHovered] = useState(false);
  const { user } = useAuth();
  const locked = !user && AUTH_REQUIRED.has(href);
  const target = locked ? '/login' : href;

  return (
    <Link href={target} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          background: hovered ? 'var(--bg-surface)' : 'var(--bg-card)',
          border: `1px solid ${hovered ? 'var(--gold)' : 'var(--gold-border)'}`,
          padding: 'clamp(32px, 5vw, 52px) clamp(24px, 4vw, 40px)',
          cursor: 'pointer',
          transition: 'background 0.3s, border-color 0.3s, transform 0.3s, box-shadow 0.3s',
          transform: hovered ? 'translateY(-8px)' : 'none',
          boxShadow: hovered
            ? '0 24px 64px rgba(23,58,54,0.08), 0 0 0 1px rgba(0,196,180,0.12), 0 0 48px rgba(0,196,180,0.07)'
            : '0 2px 12px rgba(23,58,54,0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '20px',
          height: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Teal top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: hovered
            ? 'linear-gradient(90deg, transparent, var(--gold-bright), transparent)'
            : 'transparent',
          boxShadow: hovered ? '0 0 12px rgba(0,232,213,0.5)' : 'none',
          transition: 'background 0.3s, box-shadow 0.3s',
        }} />

        {/* Icon */}
        <div style={{
          color: hovered ? 'var(--gold-bright)' : 'var(--gold)',
          transition: 'color 0.25s, filter 0.25s',
          filter: hovered ? 'drop-shadow(0 0 12px rgba(0,232,213,0.35))' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '88px',
        }}>
          <Icon />
        </div>

        {/* Divider */}
        <div style={{
          width: '60%',
          height: 1,
          background: `linear-gradient(90deg, transparent, ${hovered ? 'var(--gold-border-mid)' : 'var(--gold-border)'}, transparent)`,
          transition: 'background 0.25s',
        }} />

        {/* Text */}
        <div>
          <div style={{
            fontSize: '0.68rem',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: hovered ? 'var(--gold)' : 'var(--cream-soft)',
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            marginBottom: '8px',
            transition: 'color 0.25s',
          }}>
            {subtitle}
          </div>
          <h2 style={{
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
            fontWeight: 600,
            letterSpacing: '0.06em',
            color: hovered ? 'var(--gold-bright)' : 'var(--gold)',
            margin: '0 0 14px',
            transition: 'color 0.25s',
            textShadow: hovered ? '0 0 30px rgba(0,232,213,0.2)' : 'none',
          }}>
            {label}
          </h2>
          <p style={{
            fontSize: 'clamp(0.9rem, 1.5vw, 1rem)',
            color: 'var(--cream-soft)',
            lineHeight: 1.6,
            margin: 0,
          }}>
            {description}
          </p>
        </div>

        {/* Open indicator */}
        <div style={{
          marginTop: 'auto',
          fontSize: '0.65rem',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color: hovered ? 'var(--gold)' : 'var(--cream-muted)',
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          transition: 'color 0.25s',
          opacity: hovered ? 1 : 0.5,
        }}>
          {locked ? '🔒 Sign In →' : 'Open →'}
        </div>
      </div>
    </Link>
  );
}

// ── Discovery strips ("Popular songs / Popular artists / Recently viewed") ──
function Discovery() {
  const { user } = useAuth();
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [popular, setPopular] = useState<{ songId: string; views: number }[] | null>(null);
  const [popularWindow, setPopularWindow] = useState<'30 days' | 'all time'>('30 days');
  const [recent, setRecent] = useState<Song[]>([]);

  useEffect(() => {
    loadSongs().then(setSongs);
    (async () => {
      let r = await loadPopularSongs(30, 24);
      if (r.length < 4) { r = await loadPopularSongs(0, 24); setPopularWindow('all time'); }
      setPopular(r);
    })();
  }, []);

  useEffect(() => {
    if (!user) { setRecent([]); return; }
    loadRecentlyViewed(8).then(setRecent);
  }, [user]);

  const byId = useMemo(() => new Map((songs ?? []).map((s) => [s.id, s])), [songs]);

  const popularSongs = useMemo(() =>
    (popular ?? []).map((p) => ({ song: byId.get(p.songId), views: p.views }))
      .filter((x): x is { song: Song; views: number } => !!x.song)
      .slice(0, 8),
  [popular, byId]);

  const popularArtists = useMemo(() => {
    const acc = new Map<string, { name: string; views: number; songs: number }>();
    for (const p of popular ?? []) {
      const s = byId.get(p.songId); if (!s) continue;
      const key = s.artist.trim().toLowerCase();
      const cur = acc.get(key);
      if (cur) { cur.views += p.views; cur.songs += 1; }
      else acc.set(key, { name: s.artist.trim(), views: p.views, songs: 1 });
    }
    // Fill with most-uploaded artists when there is little play data.
    if (acc.size < 8 && songs) {
      const counts = new Map<string, { name: string; songs: number }>();
      for (const s of songs) {
        const key = s.artist.trim().toLowerCase();
        const c = counts.get(key);
        if (c) c.songs += 1; else counts.set(key, { name: s.artist.trim(), songs: 1 });
      }
      [...counts.entries()].sort((a, b) => b[1].songs - a[1].songs).forEach(([key, v]) => {
        if (acc.size < 8 && !acc.has(key)) acc.set(key, { name: v.name, views: 0, songs: v.songs });
      });
    }
    return [...acc.values()].sort((a, b) => b.views - a.views || b.songs - a.songs).slice(0, 8);
  }, [popular, byId, songs]);

  const stats = useMemo(() => {
    if (!songs) return null;
    const artists = new Set(songs.map((s) => s.artist.trim().toLowerCase())).size;
    return { songs: songs.length, artists };
  }, [songs]);

  if (!songs || popular === null) return null;
  if (popularSongs.length === 0 && popularArtists.length === 0) return null;

  return (
    <div style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', padding: 'clamp(16px, 2.5vw, 28px) clamp(16px, 3vw, 36px) 0', boxSizing: 'border-box' }}>
      {/* Quick stats */}
      {stats && (
        <div style={{ display: 'flex', gap: 'clamp(24px, 5vw, 56px)', justifyContent: 'center', marginBottom: 'clamp(18px, 3vw, 28px)' }}>
          <Stat n={stats.songs} label="Songs" href="/songs" />
          <Stat n={stats.artists} label="Artists" href="/artists" />
        </div>
      )}

      {popularSongs.length > 0 && (
        <section style={{ marginBottom: 'clamp(28px, 4vw, 44px)' }}>
          <SectionHead label={`Most played · ${popularWindow}`} title="Popular Songs" href="/top" cta="Full chart" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 230px), 1fr))', gap: '12px' }}>
            {popularSongs.map(({ song, views }, i) => (
              <MiniSongCard key={song.id} song={song} rank={i + 1} meta={`${views.toLocaleString()} plays`} />
            ))}
          </div>
        </section>
      )}

      {popularArtists.length > 0 && (
        <section style={{ marginBottom: 'clamp(28px, 4vw, 44px)' }}>
          <SectionHead label="Community favourites" title="Popular Artists" href="/artists" cta="All artists" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))', gap: '10px' }}>
            {popularArtists.map((a) => (
              <Link key={a.name.toLowerCase()} href={`/artists/${encodeURIComponent(a.name)}`} className="home-artist" style={{
                display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0,
                padding: '10px 12px', textDecoration: 'none',
                background: 'var(--bg-card)', border: '1px solid var(--gold-border)',
                boxShadow: '0 2px 10px rgba(23,58,54,0.035)', transition: 'border-color 0.2s, transform 0.2s',
              }}>
                <span style={{
                  width: '40px', height: '40px', flex: '0 0 auto', borderRadius: '10px',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-cormorant, Georgia, serif)', fontWeight: 700, fontSize: '0.9rem',
                  color: '#fff', background: 'linear-gradient(135deg, var(--gold), var(--gold-bright))',
                }}>
                  {a.name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')}
                </span>
                <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{
                    fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.98rem', fontWeight: 600,
                    color: 'var(--cream)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{a.name}</span>
                  <span style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cream-muted)' }}>
                    {a.songs} {a.songs === 1 ? 'song' : 'songs'}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {user && recent.length > 0 && (
        <section style={{ marginBottom: 'clamp(8px, 2vw, 16px)' }}>
          <SectionHead label="Pick up where you left off" title="Recently Viewed" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 230px), 1fr))', gap: '12px' }}>
            {recent.map((s) => <MiniSongCard key={s.id} song={s} />)}
          </div>
        </section>
      )}

      <style>{`.home-artist:hover { border-color: var(--gold-border-mid) !important; transform: translateY(-2px); }`}</style>
    </div>
  );
}

function SectionHead({ label, title, href, cta }: { label: string; title: string; href?: string; cta?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
      <div>
        <div style={{ ...sectionLabel, marginBottom: '4px' }}>{label}</div>
        <h2 style={sectionTitle}>{title}</h2>
      </div>
      {href && <Link href={href} style={ghostLink}>{cta ?? 'All'} →</Link>}
    </div>
  );
}

function Stat({ n, label, href }: { n: number; label: string; href: string }) {
  const pretty = n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k+` : String(n);
  return (
    <Link href={href} style={{ textDecoration: 'none', textAlign: 'center' }}>
      <div style={{
        fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: 'clamp(1.3rem, 2.4vw, 1.7rem)',
        fontWeight: 700, color: 'var(--cream)', lineHeight: 1,
      }}>{pretty}</div>
      <div style={{ fontSize: '0.58rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--gold-dim)', marginTop: '4px' }}>{label}</div>
    </Link>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── Header (compact) ── */}
      <header style={{
        borderBottom: '1px solid var(--gold-border)',
        background: 'var(--bg-base)',
        padding: 'clamp(12px, 1.6vw, 18px) clamp(16px, 3vw, 32px)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Teal radial glow behind title */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 50% 65% at 50% 50%, rgba(0,196,180,0.06) 0%, transparent 70%)',
        }} />

        <div style={{
          position: 'relative',
          display: 'inline-flex', alignItems: 'center', gap: 'clamp(10px, 1.5vw, 14px)',
          justifyContent: 'center',
        }}>
          {/* Logo mark */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" width="36" height="36">
            <defs>
              <filter id="logo-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <clipPath id="logo-pick-clip">
                <path d="M50 82 C37 70 19 57 19 43 C19 30 32 16 50 16 C68 16 81 30 81 43 C81 57 63 70 50 82Z"/>
              </clipPath>
            </defs>
            <ellipse cx="50" cy="50" rx="26" ry="30" fill="rgba(0,196,180,0.06)"/>
            <path d="M50 82 C37 70 19 57 19 43 C19 30 32 16 50 16 C68 16 81 30 81 43 C81 57 63 70 50 82Z"
                  fill="rgba(0,196,180,0.07)" stroke="#0d9488" strokeWidth="2"/>
            <g clipPath="url(#logo-pick-clip)">
              <path d="M22 49 Q31 33 40 49 Q49 65 58 49 Q67 33 78 49"
                    stroke="#0d9488" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
                    opacity="0.25" filter="url(#logo-glow)"/>
              <path d="M22 49 Q31 33 40 49 Q49 65 58 49 Q67 33 78 49"
                    stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </g>
          </svg>

          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontSize: '0.58rem', letterSpacing: '0.4em', color: 'var(--gold-dim)',
              textTransform: 'uppercase', marginBottom: '2px',
            }}>
              Guitar Companion
            </div>
            <h1 style={{
              fontSize: 'clamp(1.5rem, 2.6vw, 2.1rem)',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              margin: 0,
              lineHeight: 1.02,
              background: 'linear-gradient(135deg, var(--cream) 30%, var(--gold-bright) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Songcord
            </h1>
          </div>
        </div>
      </header>

      {/* ── Signed-out call-to-action ── */}
      <CreateAccountBanner />

      {/* ── Discovery: popular songs / artists / recently viewed ── */}
      <Discovery />

      {/* ── Grid ── */}
      <div style={{
        flex: 1,
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto',
        padding: 'clamp(24px, 4vw, 48px) clamp(16px, 3vw, 36px)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
        gap: 'clamp(14px, 2.2vw, 22px)',
        alignItems: 'stretch',
      }}>
        {cards.map((card) => (
          <NavCard key={card.href} {...card} />
        ))}
      </div>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid var(--gold-border)',
        padding: '24px',
        textAlign: 'center',
        fontSize: '0.7rem',
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
        color: 'var(--cream-muted)',
      }}>
        Guitar Companion · All rights reserved
      </footer>
    </main>
  );
}
