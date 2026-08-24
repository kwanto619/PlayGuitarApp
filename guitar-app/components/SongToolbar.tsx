'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Sticky bottom toolbar for the song page (tabsy-style): stays pinned while
 * you scroll and groups the "while playing" controls — transpose, auto-scroll
 * play/pause + speed, and lyrics text size.
 *
 * On desktop it sits to the right of the 240px nav rail; on phones it spans
 * the full width and wraps into two rows (see .song-toolbar in globals.css).
 */
export default function SongToolbar({
  hasLyrics, transpose, onTranspose, transposeLabel, scale, onScale,
}: {
  hasLyrics: boolean;
  transpose: number;
  onTranspose: (next: number) => void;
  transposeLabel: string;
  scale: number;
  onScale: (next: number) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed]     = useState(1.0);
  const speedRef  = useRef(speed);
  const accumRef  = useRef(0);   // fractional pixel accumulator
  const rafRef    = useRef<number | null>(null);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  const scroll = useCallback(() => {
    accumRef.current += speedRef.current * 0.6;
    const px = Math.floor(accumRef.current);
    if (px > 0) {
      window.scrollBy(0, px);
      accumRef.current -= px;
      // Stop automatically at the bottom of the page.
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atEnd) { setPlaying(false); return; }
    }
    rafRef.current = requestAnimationFrame(scroll);
  }, []);

  useEffect(() => {
    if (playing) {
      accumRef.current = 0;
      rafRef.current = requestAnimationFrame(scroll);
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, scroll]);

  // Space toggles auto-scroll when focus isn't in a text field.
  useEffect(() => {
    if (!hasLyrics) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.code === 'Space') { e.preventDefault(); setPlaying((p) => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasLyrics]);

  return (
    <div className="song-toolbar" role="toolbar" aria-label="Song controls">
      {/* Transpose */}
      <div className="song-toolbar-group">
        <span className="song-toolbar-label">Key</span>
        <button onClick={() => onTranspose(transpose - 1)} style={nudge} aria-label="Transpose down">−</button>
        <span style={{ ...value, color: transpose !== 0 ? 'var(--gold-bright)' : 'var(--cream)' }}>
          {transposeLabel}
        </span>
        <button onClick={() => onTranspose(transpose + 1)} style={nudge} aria-label="Transpose up">+</button>
        {transpose !== 0 && (
          <button onClick={() => onTranspose(0)} style={{ ...nudge, minWidth: 'auto', padding: '0 10px', fontSize: '0.62rem', letterSpacing: '0.14em' }}>
            RESET
          </button>
        )}
      </div>

      {/* Auto-scroll */}
      {hasLyrics && (
        <div className="song-toolbar-group song-toolbar-scroll">
          <span className="song-toolbar-label">Auto-scroll</span>
          <button
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause auto-scroll' : 'Start auto-scroll'}
            title="Space"
            style={{
              width: '46px', height: '46px', borderRadius: '50%', cursor: 'pointer', flex: '0 0 auto',
              border: `1.5px solid ${playing ? 'var(--gold-bright)' : 'var(--gold)'}`,
              background: playing ? 'var(--gold)' : 'rgba(13,148,136,0.1)',
              color: playing ? '#fff' : 'var(--gold-bright)',
              fontSize: '1.05rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            {playing ? '⏸' : '▶'}
          </button>
          <button onClick={() => setSpeed((s) => Math.max(0.2, +(s - 0.2).toFixed(1)))} style={nudge} aria-label="Slower">−</button>
          <span style={value}>{speed.toFixed(1)}×</span>
          <button onClick={() => setSpeed((s) => Math.min(5, +(s + 0.2).toFixed(1)))} style={nudge} aria-label="Faster">+</button>
        </div>
      )}

      {/* Text size */}
      {hasLyrics && (
        <div className="song-toolbar-group">
          <span className="song-toolbar-label">Text</span>
          <button onClick={() => onScale(Math.max(0.7, +(scale - 0.1).toFixed(2)))} style={nudge} aria-label="Smaller text">A−</button>
          <span style={value}>{Math.round(scale * 100)}%</span>
          <button onClick={() => onScale(Math.min(1.8, +(scale + 0.1).toFixed(2)))} style={nudge} aria-label="Larger text">A+</button>
        </div>
      )}
    </div>
  );
}

const nudge: React.CSSProperties = {
  minWidth: '40px', height: '40px', padding: '0 10px', cursor: 'pointer', flex: '0 0 auto',
  border: '1px solid var(--gold-border-mid)',
  background: 'rgba(13,148,136,0.08)', color: 'var(--gold-bright)',
  fontSize: '1.05rem', fontWeight: 700,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s',
};

const value: React.CSSProperties = {
  minWidth: '44px', textAlign: 'center',
  fontFamily: 'var(--font-cormorant, Georgia, serif)',
  fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.04em',
  color: 'var(--cream)', whiteSpace: 'nowrap',
};
