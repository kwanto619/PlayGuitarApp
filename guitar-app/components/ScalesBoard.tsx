'use client';

import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';

// ── Music Theory ────────────────────────────────────────────────────────────
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

type ScaleId = 'minor-pentatonic' | 'major-pentatonic' | 'blues-minor' | 'blues-major';
const SCALES: Record<ScaleId, { label: string; intervals: number[]; degrees: string[]; hasBoxes: boolean }> = {
  'minor-pentatonic': { label: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10],       degrees: ['1', '♭3', '4', '5', '♭7'],         hasBoxes: true  },
  'major-pentatonic': { label: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9],        degrees: ['1', '2', '3', '5', '6'],           hasBoxes: true  },
  'blues-minor':     { label: 'Minor Blues',       intervals: [0, 3, 5, 6, 7, 10],   degrees: ['1', '♭3', '4', '♭5', '5', '♭7'],   hasBoxes: false },
  'blues-major':     { label: 'Major Blues',       intervals: [0, 2, 3, 4, 7, 9],    degrees: ['1', '2', '♭3', '3', '5', '6'],     hasBoxes: false },
};

// Standard tuning — NOTES index for each open string (low E=string 6 to high e=string 1)
const TUNING = [4, 9, 2, 7, 11, 4];          // E2, A2, D3, G3, B3, E4
const OPEN_FREQ = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63]; // Hz
const FRETS = 17;

// ── Minor Pentatonic Box Shapes ──────────────────────────────────────────────
// Relative to root fret on low E string. Each box → fret offsets per string (low E → high e).
type BoxShape = [number, number][][]; // wrong — see below
interface Box {
  label: string;
  startOffset: number;              // semitones from root (low E fret offset of box start)
  shape: number[][];                // per-string fret offsets FROM root fret (low E to high e)
}

// All offsets measured from the root fret on low E.
const MIN_PENT_BOXES: Box[] = [
  { label: 'Box 1', startOffset: 0, shape: [
    [0, 3],   // low E
    [0, 2],   // A
    [0, 2],   // D
    [0, 2],   // G
    [0, 3],   // B
    [0, 3],   // high e
  ]},
  { label: 'Box 2', startOffset: 3, shape: [
    [3, 5],
    [2, 5],
    [2, 5],
    [2, 4],
    [3, 5],
    [3, 5],
  ]},
  { label: 'Box 3', startOffset: 5, shape: [
    [5, 7],
    [5, 7],
    [5, 7],
    [4, 7],
    [5, 8],
    [5, 7],
  ]},
  { label: 'Box 4', startOffset: 7, shape: [
    [7, 10],
    [7, 10],
    [7, 9],
    [7, 9],
    [8, 10],
    [7, 10],
  ]},
  { label: 'Box 5', startOffset: 10, shape: [
    [10, 12],
    [10, 12],
    [9, 12],
    [9, 12],
    [10, 12],
    [10, 12],
  ]},
];

// Major Pentatonic boxes = Minor Pentatonic boxes of the RELATIVE MINOR (root - 3 semitones),
// but the "root" note is displayed differently. Same fret positions, different highlight.

interface Props {
  defaultScale?: ScaleId;
  defaultRoot?: number;
}

export default function ScalesBoard({ defaultScale = 'minor-pentatonic', defaultRoot = 9 }: Props) {
  const [scaleId, setScaleId] = useState<ScaleId>(defaultScale);
  const [rootIdx, setRootIdx] = useState(defaultRoot);
  const [activeBox, setActiveBox] = useState<number | null>(0); // 0..4 or null (all)
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [playingScale, setPlayingScale] = useState(false);

  const scale = SCALES[scaleId];
  const showBoxes = scale.hasBoxes;

  // When scale switches away from pentatonic → clear box
  useEffect(() => {
    if (!scale.hasBoxes) setActiveBox(null);
    else if (activeBox === null) setActiveBox(0);
  }, [scaleId]); // eslint-disable-line react-hooks/exhaustive-deps

  // For major pent → shift to relative minor internally for box shapes
  const isMajor = scaleId === 'major-pentatonic';
  const shapeRootIdx = isMajor ? (rootIdx - 3 + 12) % 12 : rootIdx;
  const lowERootFret = useMemo(() => {
    // Fret where the SHAPE's root sits on low E (TUNING[0]=E=4)
    const diff = (shapeRootIdx - TUNING[0] + 12) % 12;
    return diff;
  }, [shapeRootIdx]);

  // Compute notes in the active box (absolute frets per string)
  const boxNotes = useMemo(() => {
    if (!showBoxes || activeBox === null) return null;
    const box = MIN_PENT_BOXES[activeBox];
    const perString: { stringIdx: number; fret: number }[] = [];
    for (let s = 0; s < 6; s++) {
      const strOffsets = box.shape[s];
      for (const o of strOffsets) {
        let fret = lowERootFret + o;
        // If fret goes off the board, try dropping an octave (12 frets)
        while (fret > FRETS) fret -= 12;
        while (fret < 0) fret += 12;
        if (fret >= 0 && fret <= FRETS) {
          perString.push({ stringIdx: s, fret });
        }
      }
    }
    return perString;
  }, [activeBox, lowERootFret, showBoxes]);

  // Full scale notes (for non-boxed view)
  const scaleSet = useMemo(() => {
    const s = new Map<number, number>();
    scale.intervals.forEach((iv, i) => s.set((rootIdx + iv) % 12, i));
    return s;
  }, [scale, rootIdx]);

  // boxNoteKeys for quick highlight lookup
  const boxKeySet = useMemo(() => {
    if (!boxNotes) return null;
    const s = new Set<string>();
    boxNotes.forEach((n) => s.add(`${n.stringIdx}-${n.fret}`));
    return s;
  }, [boxNotes]);

  // Audio
  const audioCtxRef = useRef<AudioContext | null>(null);
  const toneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ensureCtx = useCallback(async () => {
    if (!audioCtxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AC();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();
    return ctx;
  }, []);

  const playNote = useCallback(async (stringIdx: number, fret: number, durOverride?: number) => {
    const ctx = await ensureCtx();
    const freq = OPEN_FREQ[stringIdx] * Math.pow(2, fret / 12);
    const now = ctx.currentTime;
    const dur = durOverride ?? 1.0;
    const mk = (type: OscillatorType, f: number, g: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type; osc.frequency.value = f;
      osc.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(g, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.start(now); osc.stop(now + dur);
    };
    mk('triangle', freq, 0.22);
    mk('sine', freq * 2, 0.05);
    const key = `${stringIdx}-${fret}`;
    setPlayingKey(key);
    if (toneTimerRef.current) clearTimeout(toneTimerRef.current);
    toneTimerRef.current = setTimeout(() => setPlayingKey(null), Math.min(dur * 900, 500));
  }, [ensureCtx]);

  // Build ordered note list for playback (low pitch → high pitch)
  const orderedBoxNotes = useMemo(() => {
    if (!boxNotes) return [];
    return [...boxNotes]
      .map((n) => ({ ...n, pitch: OPEN_FREQ[n.stringIdx] * Math.pow(2, n.fret / 12) }))
      .sort((a, b) => a.pitch - b.pitch);
  }, [boxNotes]);

  const playScale = useCallback(async () => {
    if (playingScale || orderedBoxNotes.length === 0) return;
    setPlayingScale(true);
    const sequence = [...orderedBoxNotes, ...orderedBoxNotes.slice(0, -1).reverse()];
    const interval = 350; // ms between notes
    for (let i = 0; i < sequence.length; i++) {
      const n = sequence[i];
      playNote(n.stringIdx, n.fret, 0.45);
      await new Promise((r) => setTimeout(r, interval));
    }
    setPlayingScale(false);
  }, [orderedBoxNotes, playingScale, playNote]);

  // Layout
  const STR_GAP = 34;
  const FRET_GAP = 56;
  const LEFT_PAD = 44;
  const TOP_PAD = 24;
  const boardW = LEFT_PAD + FRET_GAP * FRETS + 16;
  const boardH = TOP_PAD + STR_GAP * 5 + 40;

  return (
    <div>
      {/* Controls */}
      <div style={{
        display: 'flex', gap: '18px', flexWrap: 'wrap', alignItems: 'flex-end',
        marginBottom: '16px',
      }}>
        <div>
          <Label>Scale Type</Label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(Object.keys(SCALES) as ScaleId[]).map((id) => {
              const active = scaleId === id;
              return (
                <motion.button
                  key={id}
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setScaleId(id)}
                  style={{
                    padding: '9px 14px', minHeight: '40px',
                    fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.12em',
                    textTransform: 'uppercase', cursor: 'pointer',
                    border: `1px solid ${active ? 'var(--gold-bright)' : 'var(--gold-border-mid)'}`,
                    background: active
                      ? 'linear-gradient(135deg, rgba(0,232,213,0.22), rgba(0,196,180,0.08))'
                      : 'rgba(0,196,180,0.05)',
                    color: active ? 'var(--gold-bright)' : 'var(--cream)',
                    boxShadow: active ? '0 0 14px rgba(0,232,213,0.25)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {SCALES[id].label}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div>
          <Label>Root Key</Label>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {NOTES.map((n, i) => {
              const active = rootIdx === i;
              return (
                <motion.button
                  key={n}
                  whileHover={{ scale: 1.08, y: -1 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setRootIdx(i)}
                  style={{
                    width: '40px', height: '40px',
                    fontSize: '0.86rem', fontWeight: 700,
                    cursor: 'pointer',
                    border: `1px solid ${active ? 'var(--gold-bright)' : 'var(--gold-border-mid)'}`,
                    background: active ? 'rgba(0,232,213,0.18)' : 'rgba(0,196,180,0.04)',
                    color: active ? 'var(--gold-bright)' : 'var(--cream)',
                    transition: 'all 0.12s',
                  }}
                >
                  {n}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Box selector + Play (pentatonic only) */}
      {showBoxes && (
        <div style={{
          display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end',
          marginBottom: '16px',
        }}>
          <div>
            <Label>Position (Box)</Label>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setActiveBox(null)}
                style={{
                  ...boxBtn, minWidth: '68px',
                  ...boxBtnActive(activeBox === null),
                }}
              >
                All
              </motion.button>
              {MIN_PENT_BOXES.map((b, i) => {
                const active = activeBox === i;
                return (
                  <motion.button
                    key={b.label}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setActiveBox(i)}
                    style={{ ...boxBtn, ...boxBtnActive(active) }}
                  >
                    {b.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {activeBox !== null && (
            <motion.button
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={playScale}
              disabled={playingScale}
              style={{
                padding: '10px 20px', minHeight: '44px',
                fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.18em',
                textTransform: 'uppercase', cursor: playingScale ? 'default' : 'pointer',
                border: '1px solid var(--gold-bright)',
                background: 'linear-gradient(135deg, rgba(0,232,213,0.25), rgba(0,196,180,0.1))',
                color: 'var(--gold-bright)',
                boxShadow: '0 0 16px rgba(0,232,213,0.3)',
                opacity: playingScale ? 0.6 : 1,
              }}
            >
              {playingScale ? '▶ Playing…' : '▶ Play Scale'}
            </motion.button>
          )}
        </div>
      )}

      {/* Info */}
      <div style={{
        display: 'flex', gap: '18px', flexWrap: 'wrap',
        padding: '10px 14px', marginBottom: '14px',
        border: '1px solid var(--gold-border-mid)',
        background: 'rgba(0,196,180,0.04)',
      }}>
        <Stat label="Key" value={`${NOTES[rootIdx]} ${scale.label}`} />
        <Stat label="Notes" value={scale.intervals.map((iv) => NOTES[(rootIdx + iv) % 12]).join(' · ')} />
        <Stat label="Degrees" value={scale.degrees.join(' · ')} />
        {showBoxes && activeBox !== null && (
          <Stat label="Box Range" value={boxRangeLabel(boxNotes)} />
        )}
      </div>

      {/* Fretboard */}
      <div style={{
        overflowX: 'auto', WebkitOverflowScrolling: 'touch' as const,
        border: '1px solid var(--gold-border)',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)',
        padding: '8px',
      }}>
        <svg viewBox={`0 0 ${boardW} ${boardH}`} width={boardW} height={boardH}
             style={{ display: 'block', fontFamily: 'var(--font-ibm-mono, monospace)' }}>

          {/* Fret numbers */}
          {Array.from({ length: FRETS + 1 }).map((_, f) => (
            <text key={`fn-${f}`}
              x={LEFT_PAD + f * FRET_GAP - FRET_GAP / 2}
              y={TOP_PAD - 8}
              textAnchor="middle" fontSize="10" fill="var(--cream-soft)"
              letterSpacing="0.1em"
            >
              {f === 0 ? '' : f}
            </text>
          ))}
          {/* Fret marker dots */}
          {[3, 5, 7, 9, 12, 15, 17].map((f) => {
            const cx = LEFT_PAD + f * FRET_GAP - FRET_GAP / 2;
            const cy = TOP_PAD + (STR_GAP * 5) / 2;
            const double = f === 12;
            return double ? (
              <g key={`mk-${f}`} opacity="0.25">
                <circle cx={cx} cy={cy - 14} r={4} fill="var(--gold)" />
                <circle cx={cx} cy={cy + 14} r={4} fill="var(--gold)" />
              </g>
            ) : (
              <circle key={`mk-${f}`} cx={cx} cy={cy} r={4} fill="var(--gold)" opacity="0.25" />
            );
          })}

          {/* Strings */}
          {Array.from({ length: 6 }).map((_, s) => {
            const y = TOP_PAD + s * STR_GAP;
            const w = 1 + (s * 0.22);
            return (
              <line key={`str-${s}`}
                x1={LEFT_PAD - 4} y1={y}
                x2={LEFT_PAD + FRETS * FRET_GAP} y2={y}
                stroke="#8a8a8a" strokeWidth={w} opacity="0.78"
              />
            );
          })}

          {/* String labels */}
          {Array.from({ length: 6 }).map((_, s) => {
            const stringIdx = 5 - s;
            return (
              <text key={`lab-${s}`}
                x={LEFT_PAD - 14} y={TOP_PAD + s * STR_GAP + 4}
                textAnchor="middle" fontSize="11" fill="var(--gold-dim)"
                fontWeight="600" letterSpacing="0.1em"
              >
                {NOTES[TUNING[stringIdx]]}
              </text>
            );
          })}

          {/* Fret wires */}
          {Array.from({ length: FRETS + 1 }).map((_, f) => (
            <line key={`fw-${f}`}
              x1={LEFT_PAD + f * FRET_GAP} y1={TOP_PAD - 4}
              x2={LEFT_PAD + f * FRET_GAP} y2={TOP_PAD + 5 * STR_GAP + 4}
              stroke={f === 0 ? 'var(--gold-bright)' : '#555'}
              strokeWidth={f === 0 ? 3 : 1.2}
              opacity={f === 0 ? 0.85 : 0.55}
            />
          ))}

          {/* Notes */}
          {Array.from({ length: 6 }).map((_, s) => {
            const stringIdx = 5 - s;
            return Array.from({ length: FRETS + 1 }).map((_, fret) => {
              const semitone = (TUNING[stringIdx] + fret) % 12;
              const inScale = scaleSet.has(semitone);
              if (!inScale) return null;
              const key = `${s}-${fret}`;          // display-row key
              const audioKey = `${stringIdx}-${fret}`;
              const inBox = boxKeySet ? boxKeySet.has(audioKey) : true;

              // If box active and note not in box → dim (optional show)
              if (showBoxes && activeBox !== null && !inBox) return null;

              const isRoot = semitone === rootIdx;
              const cx = fret === 0
                ? LEFT_PAD - 20
                : LEFT_PAD + fret * FRET_GAP - FRET_GAP / 2;
              const cy = TOP_PAD + s * STR_GAP;
              const playing = playingKey === audioKey;
              return (
                <g
                  key={`n-${key}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => playNote(stringIdx, fret)}
                >
                  <circle
                    cx={cx} cy={cy}
                    r={playing ? 15 : 13}
                    fill={isRoot ? 'var(--gold-bright)' : 'rgba(0,196,180,0.22)'}
                    stroke={isRoot ? 'var(--gold-bright)' : 'var(--gold)'}
                    strokeWidth={isRoot ? 0 : 1.5}
                    style={{
                      filter: playing
                        ? 'drop-shadow(0 0 12px rgba(0,232,213,0.95))'
                        : isRoot ? 'drop-shadow(0 0 6px rgba(0,232,213,0.5))' : 'none',
                      transition: 'r 0.12s, filter 0.12s',
                    }}
                  />
                  <text
                    x={cx} y={cy + 4}
                    textAnchor="middle" fontSize="10.5" fontWeight="700"
                    fill={isRoot ? '#000' : 'var(--gold-bright)'}
                    style={{ pointerEvents: 'none' }}
                  >
                    {NOTES[semitone]}
                  </text>
                </g>
              );
            });
          })}
        </svg>
      </div>

      {/* TAB row */}
      {showBoxes && activeBox !== null && orderedBoxNotes.length > 0 && (
        <TabView notes={orderedBoxNotes} />
      )}

      {/* Legend */}
      <div style={{
        display: 'flex', gap: '20px', marginTop: '12px', flexWrap: 'wrap',
        fontSize: '0.78rem', color: 'var(--cream)', letterSpacing: '0.04em',
      }}>
        <LegendItem color="var(--gold-bright)" glow label={`Root (${NOTES[rootIdx]})`} />
        <LegendItem color="rgba(0,196,180,0.22)" bordered label="Scale tone — click to play" />
        {showBoxes && activeBox !== null && (
          <span style={{ color: 'var(--cream-soft)' }}>
            Numbers below the fretboard = which fret to press, ascending from low E → high e, then back down.
          </span>
        )}
      </div>
    </div>
  );
}

// ── TAB View ────────────────────────────────────────────────────────────────
function TabView({ notes }: { notes: { stringIdx: number; fret: number; pitch: number }[] }) {
  const full = [...notes, ...notes.slice(0, -1).reverse()]; // up then down
  const STRINGS = ['e', 'B', 'G', 'D', 'A', 'E']; // high → low
  const cellW = 32;
  return (
    <div style={{
      marginTop: '16px',
      border: '1px solid var(--gold-border-mid)',
      background: '#060606',
      padding: '12px 14px',
      overflowX: 'auto',
    }}>
      <div style={{
        fontSize: '0.62rem', letterSpacing: '0.35em', color: 'var(--gold-dim)',
        textTransform: 'uppercase', marginBottom: '8px',
      }}>
        Tab · Ascending & Descending
      </div>
      <div style={{ fontFamily: 'var(--font-ibm-mono, monospace)', fontSize: '0.88rem', lineHeight: 1.35, color: 'var(--cream)', whiteSpace: 'nowrap' }}>
        {STRINGS.map((name, row) => {
          // stringIdx: high e=5 (row 0), B=4, G=3, D=2, A=1, low E=0
          const sIdx = 5 - row;
          const cells = full.map((n) => (n.stringIdx === sIdx ? String(n.fret) : '-'));
          return (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 16, color: 'var(--gold-dim)', fontWeight: 700 }}>{name}</span>
              <span style={{ color: 'var(--cream-muted)' }}>|</span>
              {cells.map((c, i) => (
                <span key={i} style={{
                  width: cellW, textAlign: 'center',
                  color: c === '-' ? 'var(--cream-muted)' : 'var(--gold-bright)',
                  fontWeight: c === '-' ? 400 : 700,
                }}>
                  {c === '-' ? '—' : c}
                </span>
              ))}
              <span style={{ color: 'var(--cream-muted)' }}>|</span>
            </div>
          );
        })}
      </div>
      <div style={{
        marginTop: '8px', fontSize: '0.72rem', color: 'var(--cream-soft)',
        letterSpacing: '0.05em', lineHeight: 1.5,
      }}>
        Read left-to-right. Each number = fret to press on that string. Play one note at a time.
        Go up (ascending), then reverse and come back down. This pattern = one box position of the scale.
      </div>
    </div>
  );
}

// ── Small helpers ────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '0.6rem', letterSpacing: '0.4em', textTransform: 'uppercase',
      color: 'var(--gold-dim)', marginBottom: '6px',
    }}>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{
        fontSize: '0.55rem', letterSpacing: '0.35em', textTransform: 'uppercase',
        color: 'var(--gold-dim)',
      }}>
        {label}
      </div>
      <div style={{ fontSize: '0.92rem', color: 'var(--cream)', fontWeight: 600, letterSpacing: '0.04em' }}>
        {value}
      </div>
    </div>
  );
}

function LegendItem({ color, glow, bordered, label }: { color: string; glow?: boolean; bordered?: boolean; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <span style={{
        display: 'inline-block', width: 14, height: 14, borderRadius: '50%',
        background: color,
        border: bordered ? '1.5px solid var(--gold)' : 'none',
        boxShadow: glow ? '0 0 8px rgba(0,232,213,0.6)' : 'none',
      }} />
      {label}
    </span>
  );
}

const boxBtn: React.CSSProperties = {
  padding: '9px 14px', minHeight: '40px', minWidth: '58px',
  fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em',
  textTransform: 'uppercase', cursor: 'pointer',
  transition: 'all 0.15s',
};
function boxBtnActive(active: boolean): React.CSSProperties {
  return {
    border: `1px solid ${active ? 'var(--gold-bright)' : 'var(--gold-border-mid)'}`,
    background: active
      ? 'linear-gradient(135deg, rgba(0,232,213,0.22), rgba(0,196,180,0.08))'
      : 'rgba(0,196,180,0.05)',
    color: active ? 'var(--gold-bright)' : 'var(--cream)',
    boxShadow: active ? '0 0 12px rgba(0,232,213,0.2)' : 'none',
  };
}

function boxRangeLabel(notes: { stringIdx: number; fret: number }[] | null): string {
  if (!notes || notes.length === 0) return '—';
  const frets = notes.map((n) => n.fret);
  return `Frets ${Math.min(...frets)}–${Math.max(...frets)}`;
}
