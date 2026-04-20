'use client';

import Link from 'next/link';
import { useState } from 'react';
import UserMenu from '@/components/UserMenu';
import { useAuth } from '@/lib/auth';

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

function SearchIcon() {
  return (
    <svg viewBox="0 0 80 72" width="80" height="72" fill="none" stroke="currentColor">
      <circle cx="34" cy="32" r="18" strokeWidth="2.5" />
      <line x1="48" y1="46" x2="66" y2="62" strokeWidth="3" strokeLinecap="round" />
      <circle cx="34" cy="32" r="6" fill="currentColor" stroke="none" opacity="0.5" />
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
    href:        '/tuner',
    label:       'Tuner',
    subtitle:    'Chromatic precision',
    description: 'Real-time pitch detection with an analog dial. Tune by ear with scientific accuracy.',
    Icon:        TunerIcon,
  },
  {
    href:        '/chords',
    label:       'Chord Library',
    subtitle:    'Reference & sound',
    description: 'Browse every chord shape, hear how it sounds, and study the finger positions.',
    Icon:        ChordsIcon,
  },
  {
    href:        '/songs',
    label:       'Songs',
    subtitle:    'Community library',
    description: 'Every song uploaded by any member. Hover chords for diagrams, view who uploaded each song.',
    Icon:        SongsIcon,
  },
  {
    href:        '/playlists',
    label:       'Playlists',
    subtitle:    'Sets & setlists',
    description: 'Group songs into playlists for gigs, practice sessions, or any occasion.',
    Icon:        PlaylistsIcon,
  },
  {
    href:        '/metronome',
    label:       'Metronome',
    subtitle:    'Keep the beat',
    description: 'BPM slider, tap tempo, and visual beat indicator. Saved per song so it\'s ready when you open it.',
    Icon:        MetronomeIcon,
  },
  {
    href:        '/progressions',
    label:       'Progressions',
    subtitle:    'Chord sequences',
    description: 'Build chord progressions like Am–F–C–G, loop them with the metronome, and save them for practice.',
    Icon:        ProgressionsIcon,
  },
  {
    href:        '/favorites',
    label:       'Favorites',
    subtitle:    'Hearts you gave',
    description: 'Songs you marked with a heart — your personal shortlist across the whole library.',
    Icon:        FavoritesIcon,
  },
  {
    href:        '/feed',
    label:       'Feed',
    subtitle:    'From people you follow',
    description: 'Latest song uploads from accounts you follow. Keep up with friends and artists you like.',
    Icon:        FeedIcon,
  },
  {
    href:        '/search',
    label:       'Find Members',
    subtitle:    'Discover players',
    description: 'Search for friends by username. See their songs, playlists, and follow them for updates.',
    Icon:        SearchIcon,
  },
] as const;

function NavCard({ href, label, subtitle, description, Icon }: typeof cards[number]) {
  const [hovered, setHovered] = useState(false);
  const { user } = useAuth();
  const locked = !user && AUTH_REQUIRED.has(href);
  const target = locked ? '/auth' : href;

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
            ? '0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,196,180,0.12), 0 0 48px rgba(0,196,180,0.07)'
            : '0 2px 12px rgba(0,0,0,0.5)',
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

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── Header ── */}
      <header style={{
        borderBottom: '1px solid var(--gold-border)',
        background: 'var(--bg-base)',
        padding: 'clamp(48px, 8vw, 88px) clamp(20px, 4vw, 40px)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '16px', right: '20px', zIndex: 2 }}>
          <UserMenu />
        </div>
        {/* Teal radial glow behind title */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(0,196,180,0.07) 0%, transparent 70%)',
        }} />

        <div style={{ position: 'relative' }}>
          {/* Logo mark */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" width="72" height="72">
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
                    fill="rgba(0,196,180,0.07)" stroke="#00c4b4" strokeWidth="2"/>
              <g clipPath="url(#logo-pick-clip)">
                <path d="M22 49 Q31 33 40 49 Q49 65 58 49 Q67 33 78 49"
                      stroke="#00e8d5" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
                      opacity="0.25" filter="url(#logo-glow)"/>
                <path d="M22 49 Q31 33 40 49 Q49 65 58 49 Q67 33 78 49"
                      stroke="#00e8d5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
            </svg>
          </div>

          <div style={{
            fontSize: '0.65rem', letterSpacing: '0.55em', color: 'var(--gold-dim)',
            textTransform: 'uppercase', marginBottom: '20px',
          }}>
            Guitar Companion
          </div>

          <h1 style={{
            fontSize: 'clamp(3rem, 8vw, 6.5rem)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            margin: '0 0 16px',
            lineHeight: 1,
            background: 'linear-gradient(135deg, #ffffff 30%, var(--gold-bright) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Play Guitar
          </h1>

          {/* Teal accent line */}
          <div style={{
            width: '64px', height: '3px', margin: '0 auto 20px',
            background: 'linear-gradient(90deg, transparent, var(--gold-bright), transparent)',
            boxShadow: '0 0 16px rgba(0,232,213,0.6)',
          }} />

          <p style={{
            fontSize: 'clamp(0.9rem, 1.5vw, 1.05rem)',
            color: 'var(--cream-soft)',
            margin: 0,
            letterSpacing: '0.02em',
          }}>
            Tuner · Chords · Songs · Playlists · Metronome · Progressions
          </p>
        </div>
      </header>

      {/* ── Grid ── */}
      <div style={{
        flex: 1,
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto',
        padding: 'clamp(40px, 7vw, 80px) clamp(20px, 4vw, 48px)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
        gap: 'clamp(16px, 3vw, 28px)',
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
