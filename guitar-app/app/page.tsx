'use client';

import Link from 'next/link';
import { useState } from 'react';

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
    label:       'My Songs',
    subtitle:    'Your collection',
    description: 'Store lyrics, chords and notes for every song you play. Hover chords to see diagrams.',
    Icon:        SongsIcon,
  },
] as const;

function NavCard({ href, label, subtitle, description, Icon }: typeof cards[number]) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          background: hovered ? 'var(--bg-surface)' : 'var(--bg-card)',
          border: `1px solid ${hovered ? 'var(--gold-border-mid)' : 'var(--gold-border)'}`,
          padding: 'clamp(32px, 5vw, 52px) clamp(24px, 4vw, 40px)',
          cursor: 'pointer',
          transition: 'background 0.25s, border-color 0.25s, transform 0.25s, box-shadow 0.25s',
          transform: hovered ? 'translateY(-6px)' : 'none',
          boxShadow: hovered
            ? '0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(200,152,32,0.07)'
            : '0 4px 20px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '20px',
          height: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Corner brackets */}
        {([
          { top:  8, left:  8, borderTop:    `1px solid ${hovered ? 'var(--gold)' : 'var(--gold-border-mid)'}`, borderLeft:   `1px solid ${hovered ? 'var(--gold)' : 'var(--gold-border-mid)'}` },
          { top:  8, right: 8, borderTop:    `1px solid ${hovered ? 'var(--gold)' : 'var(--gold-border-mid)'}`, borderRight:  `1px solid ${hovered ? 'var(--gold)' : 'var(--gold-border-mid)'}` },
          { bottom: 8, left:  8, borderBottom: `1px solid ${hovered ? 'var(--gold)' : 'var(--gold-border-mid)'}`, borderLeft:   `1px solid ${hovered ? 'var(--gold)' : 'var(--gold-border-mid)'}` },
          { bottom: 8, right: 8, borderBottom: `1px solid ${hovered ? 'var(--gold)' : 'var(--gold-border-mid)'}`, borderRight:  `1px solid ${hovered ? 'var(--gold)' : 'var(--gold-border-mid)'}` },
        ] as React.CSSProperties[]).map((s, i) => (
          <div key={i} style={{ position: 'absolute', width: 18, height: 18, transition: 'border-color 0.25s', ...s }} />
        ))}

        {/* Icon */}
        <div style={{
          color: hovered ? 'var(--gold-bright)' : 'var(--gold)',
          transition: 'color 0.25s, filter 0.25s',
          filter: hovered ? 'drop-shadow(0 0 12px rgba(232,192,64,0.35))' : 'none',
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
            fontSize: '0.58rem',
            letterSpacing: '0.45em',
            textTransform: 'uppercase',
            color: hovered ? 'var(--gold-dim)' : 'var(--cream-muted)',
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
            textShadow: hovered ? '0 0 30px rgba(232,192,64,0.2)' : 'none',
          }}>
            {label}
          </h2>
          <p style={{
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)',
            fontStyle: 'italic',
            color: 'var(--cream-muted)',
            lineHeight: 1.65,
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
          Open →
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
        background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-base) 100%)',
        padding: 'clamp(36px, 6vw, 64px) clamp(20px, 4vw, 40px)',
        textAlign: 'center',
        position: 'relative',
      }}>
        {/* Horizontal rule pattern */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(200,152,32,0.018) 24px, rgba(200,152,32,0.018) 25px)',
        }} />

        <div style={{ position: 'relative', display: 'inline-block', padding: 'clamp(16px, 3vw, 24px) clamp(32px, 6vw, 72px)' }}>
          {/* Corner brackets */}
          {([
            { top: -2, left: -2,   borderTop:    '2px solid var(--gold)', borderLeft:   '2px solid var(--gold)' },
            { top: -2, right: -2,  borderTop:    '2px solid var(--gold)', borderRight:  '2px solid var(--gold)' },
            { bottom: -2, left: -2,  borderBottom: '2px solid var(--gold)', borderLeft:   '2px solid var(--gold)' },
            { bottom: -2, right: -2, borderBottom: '2px solid var(--gold)', borderRight:  '2px solid var(--gold)' },
          ] as React.CSSProperties[]).map((s, i) => (
            <div key={i} style={{ position: 'absolute', width: 16, height: 16, ...s }} />
          ))}
          <div style={{
            border: '1px solid var(--gold-border-mid)',
            background: 'rgba(0,0,0,0.25)',
            padding: 'clamp(14px, 2.5vw, 20px) clamp(28px, 5vw, 60px)',
          }}>
            <div style={{
              fontSize: '0.58rem', letterSpacing: '0.55em', color: 'var(--gold-dim)',
              textTransform: 'uppercase', fontFamily: 'var(--font-cormorant, Georgia, serif)',
              marginBottom: '6px',
            }}>
              ✦ Companion Series ✦
            </div>
            <h1 style={{
              fontFamily: 'var(--font-cormorant, Georgia, serif)',
              fontSize: 'clamp(2.6rem, 6vw, 5rem)',
              fontWeight: 600,
              letterSpacing: '0.06em',
              color: 'var(--gold-bright)',
              margin: 0,
              lineHeight: 1.05,
              textShadow: '0 0 60px rgba(232,192,64,0.2)',
            }}>
              Guitar Companion
            </h1>
            <div style={{
              fontSize: '0.58rem', letterSpacing: '0.5em', color: 'var(--cream-muted)',
              textTransform: 'uppercase', fontFamily: 'var(--font-cormorant, Georgia, serif)',
              marginTop: '8px',
            }}>
              Tuner · Chords · Songs
            </div>
          </div>
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
        padding: '20px',
        textAlign: 'center',
        fontFamily: 'var(--font-cormorant, Georgia, serif)',
        fontSize: '0.6rem',
        letterSpacing: '0.4em',
        textTransform: 'uppercase',
        color: 'var(--cream-muted)',
        opacity: 0.4,
      }}>
        Guitar Companion · All rights reserved
      </footer>
    </main>
  );
}
