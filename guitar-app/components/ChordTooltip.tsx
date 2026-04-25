'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { chords as chordLibrary } from '@/data/chords';
import ChordDiagram from './ChordDiagram';
import { Chord } from '@/types';

interface TooltipPos {
  top: number;
  left: number;
}

interface ChordTooltipProps {
  name: string;
  children: React.ReactNode;
}

export default function ChordTooltip({ name, children }: ChordTooltipProps) {
  const [pos, setPos]       = useState<TooltipPos | null>(null);
  const [isTouch, setIsTouch] = useState(false);
  const triggerRef          = useRef<HTMLSpanElement>(null);
  const chord: Chord | undefined = chordLibrary.find((c) => c.name === name);

  // Detect touch-primary devices once on mount
  useEffect(() => {
    setIsTouch(window.matchMedia('(hover: none) and (pointer: coarse)').matches);
  }, []);

  // Close tooltip on scroll / resize. Browsers do not reliably fire
  // mouseleave on programmatic or auto-scroll, which left ghost popups
  // stacked when triggers scrolled under the cursor.
  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [pos]);

  // On touch: close when tapping outside the trigger
  useEffect(() => {
    if (!isTouch || !pos) return;
    const handleOutside = (e: TouchEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setPos(null);
      }
    };
    document.addEventListener('touchstart', handleOutside);
    return () => document.removeEventListener('touchstart', handleOutside);
  }, [isTouch, pos]);

  if (!chord) return <>{children}</>;

  const getPos = () => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.top, left: r.left + r.width / 2 });
  };

  const handleEnter = () => { if (!isTouch) getPos(); };
  const handleLeave = () => { if (!isTouch) setPos(null); };
  const handleClick = (e: React.MouseEvent) => {
    if (!isTouch) return;
    e.stopPropagation();
    if (pos) { setPos(null); } else { getPos(); }
  };

  // Tooltip dimensions — clamped to viewport width
  const TOOLTIP_W = Math.min(200, (typeof window !== 'undefined' ? window.innerWidth : 400) - 24);
  const TOOLTIP_H = 270;
  const GAP = 10;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 400;

  const tooltipStyle: React.CSSProperties | null = pos
    ? {
        position: 'fixed',
        top: pos.top - TOOLTIP_H - GAP > 0
          ? pos.top - TOOLTIP_H - GAP
          : pos.top + GAP + 24,
        left: Math.min(
          Math.max(pos.left - TOOLTIP_W / 2, 8),
          vw - TOOLTIP_W - 8,
        ),
        width: TOOLTIP_W,
        zIndex: 9990,
        pointerEvents: 'none',
      }
    : null;

  const arrowAbove = pos ? pos.top - TOOLTIP_H - GAP > 0 : true;

  return (
    <>
      <span
        ref={triggerRef}
        style={{ display: 'inline' }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onClick={handleClick}
      >
        {children}
      </span>

      {pos && tooltipStyle && createPortal(
        <div style={tooltipStyle}>
          {/* Panel */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--gold-border-mid)',
            padding: '12px 14px 10px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.9), 0 0 0 1px rgba(0,196,180,0.07)',
          }}>
            {/* Name */}
            <div style={{
              textAlign: 'center',
              fontFamily: 'var(--font-cormorant, Georgia, serif)',
              fontSize: '1.4rem', fontWeight: 600,
              letterSpacing: '0.06em', color: 'var(--gold-bright)',
              marginBottom: '4px',
              textShadow: '0 0 20px rgba(0,232,213,0.2)',
            }}>
              {chord.name}
            </div>

            {/* Type */}
            <div style={{
              textAlign: 'center',
              fontFamily: 'var(--font-cormorant, Georgia, serif)',
              fontSize: '0.58rem', letterSpacing: '0.35em',
              textTransform: 'uppercase', color: 'var(--gold-dim)',
              marginBottom: '8px',
            }}>
              {chord.type}
            </div>

            {/* Divider */}
            <div style={{
              height: 1,
              background: 'linear-gradient(90deg, transparent, var(--gold-border-mid), transparent)',
              marginBottom: '8px',
            }} />

            {/* Diagram */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <ChordDiagram chord={chord} />
            </div>
          </div>

          {/* Arrow */}
          {arrowAbove ? (
            // Arrow at bottom of tooltip, pointing down toward trigger
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: 0, height: 0 }}>
                <div style={{
                  position: 'absolute', top: 0, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0, height: 0,
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '8px solid var(--gold-border-mid)',
                }} />
                <div style={{
                  position: 'absolute', top: -1, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0, height: 0,
                  borderLeft: '7px solid transparent',
                  borderRight: '7px solid transparent',
                  borderTop: '7px solid var(--bg-surface)',
                }} />
              </div>
            </div>
          ) : (
            // Arrow at top of tooltip, pointing up toward trigger
            <div style={{ display: 'flex', justifyContent: 'center', order: -1 }}>
              <div style={{ position: 'relative', width: 0, height: 0 }}>
                <div style={{
                  position: 'absolute', bottom: 0, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0, height: 0,
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderBottom: '8px solid var(--gold-border-mid)',
                }} />
                <div style={{
                  position: 'absolute', bottom: -1, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0, height: 0,
                  borderLeft: '7px solid transparent',
                  borderRight: '7px solid transparent',
                  borderBottom: '7px solid var(--bg-surface)',
                }} />
              </div>
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}

// ── Lyrics parser ────────────────────────────────────────────────────────────
const sortedChordNames = [...chordLibrary]
  .sort((a, b) => b.name.length - a.name.length)
  .map((c) => c.name.replace(/[#]/g, '\\$&'));

const CHORD_PATTERN = new RegExp(
  `(?<![A-Za-z])(${sortedChordNames.join('|')})(?![A-Za-z0-9])`,
  'g',
);

export type LyricsSegment = { type: 'text' | 'chord'; content: string };

export function parseLyrics(text: string): LyricsSegment[] {
  const segments: LyricsSegment[] = [];
  let lastIndex = 0;
  CHORD_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = CHORD_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'chord', content: match[1] });
    lastIndex = CHORD_PATTERN.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return segments;
}
