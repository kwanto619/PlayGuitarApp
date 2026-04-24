'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Progression } from '@/types';
import { loadProgressions, addProgression, updateProgression, deleteProgression } from '@/lib/storage';
import { getTempoName } from '@/lib/transpose';
import ChordDiagram from './ChordDiagram';
import { chords as chordLibrary } from '@/data/chords';

// ── Constants ─────────────────────────────────────────────────────────────────
const ROOTS    = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SUFFIXES = [
  { label: 'maj', value: '' },
  { label: 'min', value: 'm' },
  { label: '7',   value: '7' },
  { label: 'maj7', value: 'maj7' },
  { label: 'm7',  value: 'm7' },
  { label: 'dim', value: 'dim' },
  { label: 'aug', value: 'aug' },
  { label: 'sus2', value: 'sus2' },
  { label: 'sus4', value: 'sus4' },
  { label: 'add9', value: 'add9' },
];
const BEATS_OPTIONS = [1, 2, 4];

// ── Instrument types ──────────────────────────────────────────────────────────
type InstrumentId = 'guitar' | 'piano' | 'organ' | 'electric' | 'bass';
const INSTRUMENTS: { id: InstrumentId; label: string; icon: string }[] = [
  { id: 'guitar',   label: 'Guitar',   icon: '🎸' },
  { id: 'piano',    label: 'Piano',    icon: '🎹' },
  { id: 'organ',    label: 'Organ',    icon: '🎷' },
  { id: 'electric', label: 'Electric', icon: '⚡' },
  { id: 'bass',     label: 'Bass',     icon: '🎵' },
];

// ── Shared style helpers ──────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: '0.6rem', letterSpacing: '0.4em', textTransform: 'uppercase',
  color: 'var(--gold-dim)', marginBottom: '8px', display: 'block',
};

function GoldBtn({ children, onClick, disabled, variant = 'primary', style }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'danger'; style?: React.CSSProperties;
}) {
  const v: Record<string, React.CSSProperties> = {
    primary: { borderColor: 'var(--gold-border-mid)', background: 'linear-gradient(135deg, rgba(0,130,120,0.6), rgba(0,90,83,0.4))', color: 'var(--gold-bright)' },
    ghost:   { borderColor: 'var(--gold-border)', background: 'transparent', color: 'var(--cream-muted)' },
    danger:  { borderColor: 'rgba(224,72,72,0.4)', background: 'rgba(224,72,72,0.07)', color: 'var(--red-tuning)' },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '10px 20px', minHeight: '42px', cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase',
      border: '1px solid', transition: 'all 0.15s', opacity: disabled ? 0.5 : 1,
      ...v[variant], ...style,
    }}>
      {children}
    </button>
  );
}

// ── Open string frequencies (E A D G B e) ────────────────────────────────────
const OPEN_FREQ = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];

// ── Synthesis helpers ─────────────────────────────────────────────────────────
function addSineHarmonic(ctx: AudioContext, freq: number, gain: number, start: number, duration: number, attack: number) {
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination);
  osc.type = 'sine'; osc.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + attack);
  g.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.start(start); osc.stop(start + duration);
}
function synthKick(ctx: AudioContext, time: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.3);
  gain.gain.setValueAtTime(0.8, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
  osc.start(time); osc.stop(time + 0.4);
}
function synthSnare(ctx: AudioContext, time: number) {
  const bufLen = Math.floor(ctx.sampleRate * 0.2);
  const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data   = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  const src  = ctx.createBufferSource(); src.buffer = buf;
  const hp   = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1000;
  const gain = ctx.createGain();
  src.connect(hp); hp.connect(gain); gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.4, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
  src.start(time); src.stop(time + 0.2);
}
function synthHihat(ctx: AudioContext, time: number) {
  const bufLen = Math.floor(ctx.sampleRate * 0.05);
  const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data   = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  const src  = ctx.createBufferSource(); src.buffer = buf;
  const hp   = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
  const gain = ctx.createGain();
  src.connect(hp); hp.connect(gain); gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.12, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  src.start(time); src.stop(time + 0.05);
}

// ── Loop player hook ──────────────────────────────────────────────────────────
function useLoopPlayer(
  bpm: number, chords: string[], beatsPerChord: number,
  onBeat: (chordIdx: number) => void,
  instrument: InstrumentId, drums: boolean,
) {
  const audioCtxRef   = useRef<AudioContext | null>(null);
  const nextNoteRef   = useRef(0);
  const beatCountRef  = useRef(0);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const bpmRef        = useRef(bpm);
  const chordsRef     = useRef(chords);
  const bpcRef        = useRef(beatsPerChord);
  const onBeatRef     = useRef(onBeat);
  const instrumentRef = useRef(instrument);
  const drumsRef      = useRef(drums);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { chordsRef.current = chords; }, [chords]);
  useEffect(() => { bpcRef.current = beatsPerChord; }, [beatsPerChord]);
  useEffect(() => { onBeatRef.current = onBeat; }, [onBeat]);
  useEffect(() => { instrumentRef.current = instrument; }, [instrument]);
  useEffect(() => { drumsRef.current = drums; }, [drums]);

  const scheduleChord = useCallback((chordName: string, time: number) => {
    const ctx  = audioCtxRef.current!;
    const inst = instrumentRef.current;
    const chordData = chordLibrary.find((c) => c.name === chordName);
    if (!chordData) return;
    if (inst === 'bass') {
      for (let si = 0; si < chordData.strings.length; si++) {
        const fret = chordData.strings[si];
        if (fret === 'x') continue;
        const fretNum = fret === 'o' ? 0 : (fret as number);
        const freq = OPEN_FREQ[si] * Math.pow(2, fretNum / 12) * 0.5;
        addSineHarmonic(ctx, freq, 0.55, time, 3.0, 0.02);
        addSineHarmonic(ctx, freq * 2, 0.12, time, 2.5, 0.02);
        break;
      }
      return;
    }
    chordData.strings.forEach((fret, si) => {
      if (fret === 'x') return;
      const fretNum = fret === 'o' ? 0 : (fret as number);
      const freq    = OPEN_FREQ[si] * Math.pow(2, fretNum / 12);
      if (inst === 'guitar') {
        const t   = time + si * 0.03;
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.type = 'triangle'; osc.frequency.value = freq;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.13, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
        osc.start(t); osc.stop(t + 2.0);
      } else if (inst === 'piano') {
        const t = time + si * 0.008;
        addSineHarmonic(ctx, freq,     0.10,  t, 1.8, 0.005);
        addSineHarmonic(ctx, freq * 2, 0.04,  t, 1.2, 0.005);
        addSineHarmonic(ctx, freq * 3, 0.015, t, 0.9, 0.005);
      } else if (inst === 'organ') {
        const dur = Math.max(0.3, (60 / bpmRef.current) * bpcRef.current * 0.9);
        const harmonicGains = [0.06, 0.035, 0.018, 0.009];
        [1, 2, 3, 4].forEach((h, hi) => {
          const osc = ctx.createOscillator(); const g = ctx.createGain();
          osc.connect(g); g.connect(ctx.destination);
          osc.type = 'sine'; osc.frequency.value = freq * h;
          g.gain.setValueAtTime(harmonicGains[hi], time);
          g.gain.setValueAtTime(harmonicGains[hi], time + dur - 0.05);
          g.gain.linearRampToValueAtTime(0, time + dur);
          osc.start(time); osc.stop(time + dur);
        });
      } else if (inst === 'electric') {
        const t    = time + si * 0.025;
        const osc  = ctx.createOscillator();
        const ws   = ctx.createWaveShaper();
        const g    = ctx.createGain();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
          const x = (i * 2) / 256 - 1;
          curve[i] = (Math.PI + 200) * x / (Math.PI + 200 * Math.abs(x));
        }
        ws.curve = curve;
        osc.connect(ws); ws.connect(g); g.connect(ctx.destination);
        osc.type = 'sawtooth'; osc.frequency.value = freq;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.08, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
        osc.start(t); osc.stop(t + 2.5);
      }
    });
  }, []);

  const scheduleDrum = useCallback((beat: number, time: number) => {
    const ctx = audioCtxRef.current!;
    const beatInBar = beat % 4;
    synthHihat(ctx, time);
    if (beatInBar === 0 || beatInBar === 2) synthKick(ctx, time);
    if (beatInBar === 1 || beatInBar === 3) synthSnare(ctx, time);
  }, []);

  const tick = useCallback(() => {
    const ctx = audioCtxRef.current!;
    while (nextNoteRef.current < ctx.currentTime + 0.1) {
      const beat        = beatCountRef.current;
      const chordIdx    = Math.floor(beat / bpcRef.current) % Math.max(1, chordsRef.current.length);
      const beatInChord = beat % bpcRef.current;
      if (beatInChord === 0 && chordsRef.current.length > 0) {
        scheduleChord(chordsRef.current[chordIdx], nextNoteRef.current);
      }
      if (drumsRef.current) scheduleDrum(beat, nextNoteRef.current);
      const delay = Math.max(0, (nextNoteRef.current - ctx.currentTime) * 1000);
      const ci = chordIdx;
      setTimeout(() => onBeatRef.current(ci), delay);
      beatCountRef.current++;
      nextNoteRef.current += 60 / bpmRef.current;
    }
  }, [scheduleChord, scheduleDrum]);

  const start = useCallback(() => {
    if (!audioCtxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AC();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    beatCountRef.current = 0;
    nextNoteRef.current  = ctx.currentTime + 0.05;
    intervalRef.current  = setInterval(tick, 25);
  }, [tick]);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return { start, stop };
}

// ── Progression Card (list view) ─────────────────────────────────────────────
function ProgressionCard({ prog, onClick, index }: { prog: Progression; onClick: () => void; index: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${hovered ? 'var(--gold)' : 'var(--gold-border)'}`,
        padding: '22px', cursor: 'pointer',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,196,180,0.1)' : '0 2px 8px rgba(0,0,0,0.4)',
        transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
      }}
    >
      <div style={{ fontSize: '1.1rem', fontWeight: 600, color: hovered ? 'var(--gold-bright)' : 'var(--gold)', marginBottom: '10px', transition: 'color 0.2s' }}>
        {prog.name || 'Untitled'}
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {prog.chords.map((c, i) => (
          <span key={i} style={{ padding: '3px 10px', fontSize: '0.82rem', fontWeight: 600, border: '1px solid var(--gold-border-mid)', background: 'rgba(0,196,180,0.06)', color: 'var(--gold-bright)' }}>
            {c}
          </span>
        ))}
        {prog.chords.length === 0 && <span style={{ fontSize: '0.85rem', color: 'var(--cream-muted)', fontStyle: 'italic' }}>No chords yet</span>}
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--cream-muted)', letterSpacing: '0.1em' }}>
        {prog.bpm} BPM · {getTempoName(prog.bpm)}
      </div>
    </motion.div>
  );
}

// ── Builder View (2-column on desktop) ───────────────────────────────────────
function BuilderView({
  progression, onSave, onDelete, onBack,
}: {
  progression: Progression | null;
  onSave: (name: string, chords: string[], bpm: number) => Promise<void>;
  onDelete: (() => Promise<void>) | null;
  onBack: () => void;
}) {
  const isNew = progression === null;
  const [name,           setName]           = useState(progression?.name ?? '');
  const [chords,         setChords]         = useState<string[]>(progression?.chords ?? []);
  const [bpm,            setBpm]            = useState(progression?.bpm ?? 100);
  const [selectedRoot,   setSelectedRoot]   = useState('A');
  const [selectedSuffix, setSelectedSuffix] = useState('m');
  const [beatsPerChord,  setBeatsPerChord]  = useState(2);
  const [isPlaying,      setIsPlaying]      = useState(false);
  const [currentChord,   setCurrentChord]   = useState(-1);
  const [saving,         setSaving]         = useState(false);
  const [confirmDel,     setConfirmDel]     = useState(false);
  const [instrument,     setInstrument]     = useState<InstrumentId>('guitar');
  const [drumsOn,        setDrumsOn]        = useState(false);

  const { start, stop } = useLoopPlayer(
    bpm, chords, beatsPerChord,
    (idx) => setCurrentChord(idx),
    instrument, drumsOn,
  );

  const handleTogglePlay = () => {
    if (chords.length === 0) return;
    if (isPlaying) { stop(); setIsPlaying(false); setCurrentChord(-1); }
    else           { start(); setIsPlaying(true); }
  };

  const handleAddChord = () => {
    const chord = selectedRoot + selectedSuffix;
    setChords((prev) => [...prev, chord]);
  };

  const handleRemoveChord = (idx: number) => {
    setChords((prev) => prev.filter((_, i) => i !== idx));
    if (isPlaying) { stop(); setIsPlaying(false); setCurrentChord(-1); }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try { await onSave(name.trim(), chords, bpm); }
    finally { setSaving(false); }
  };

  const activeChord = currentChord >= 0 && currentChord < chords.length
    ? chordLibrary.find((c) => c.name === chords[currentChord])
    : null;

  return (
    <div className="prog-builder-root" style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', minHeight: 0,
    }}>
      {/* Top action row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '12px', padding: '12px 0',
        flexShrink: 0,
      }}>
        <button onClick={() => { if (isPlaying) { stop(); setIsPlaying(false); } onBack(); }} style={{
          padding: '8px 16px', minHeight: '40px', fontSize: '0.8rem', fontWeight: 500,
          letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer',
          border: '1px solid var(--gold-border)', background: 'transparent', color: 'var(--cream-muted)',
        }}>
          ← Back
        </button>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <GoldBtn onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : (isNew ? 'Save' : 'Update')}
          </GoldBtn>
          {!isNew && onDelete && (
            confirmDel
              ? <>
                  <GoldBtn variant="danger" onClick={async () => { await onDelete(); }}>Confirm Delete</GoldBtn>
                  <GoldBtn variant="ghost" onClick={() => setConfirmDel(false)}>Cancel</GoldBtn>
                </>
              : <GoldBtn variant="danger" onClick={() => setConfirmDel(true)}>Delete</GoldBtn>
          )}
        </div>
      </div>

      {/* 2-column grid — desktop: 30/70, no scroll; mobile: stacked, scrollable */}
      <div className="prog-builder-grid" style={{
        flex: 1, minHeight: 0,
        display: 'grid',
        gap: '20px',
      }}>
        {/* ── LEFT 30%: Chord sequence (click card to remove) ── */}
        <div className="prog-col-left" style={{
          border: '1px solid var(--gold-border)',
          background: 'var(--bg-card)',
          padding: '16px',
          display: 'flex', flexDirection: 'column',
          minHeight: 0, overflow: 'hidden',
        }}>
          <div style={{ ...labelStyle, marginBottom: '10px', flexShrink: 0 }}>
            Sequence · <span style={{ color: 'var(--cream-soft)', letterSpacing: '0.1em', textTransform: 'none' }}>{chords.length} chord{chords.length !== 1 ? 's' : ''}</span>
          </div>

          {chords.length === 0 ? (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px dashed var(--gold-border)',
              color: 'var(--cream-muted)', fontSize: '0.9rem', fontStyle: 'italic',
              textAlign: 'center', padding: '16px',
            }}>
              Pick chords on the right →
            </div>
          ) : (
            <div style={{
              flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch' as const,
              paddingRight: '4px',
            }}>
              <LayoutGroup>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignContent: 'flex-start' }}>
                  <AnimatePresence mode="popLayout">
                    {chords.map((chord, idx) => (
                      <motion.button
                        key={`${chord}-${idx}`}
                        layout
                        initial={{ opacity: 0, scale: 0.6, rotate: -6 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.4, rotate: 10, transition: { duration: 0.2 } }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.92 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                        onClick={() => handleRemoveChord(idx)}
                        title="Click to remove"
                        style={{
                          position: 'relative',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                          padding: '14px 18px',
                          border: `2px solid ${currentChord === idx ? 'var(--gold-bright)' : 'var(--gold-border)'}`,
                          background: currentChord === idx ? 'rgba(0,232,213,0.12)' : 'var(--bg-surface)',
                          boxShadow: currentChord === idx ? '0 0 20px rgba(0,232,213,0.28)' : 'none',
                          cursor: 'pointer', color: 'var(--cream)',
                          minWidth: '76px',
                        }}
                      >
                        <span style={{
                          fontSize: '1.35rem', fontWeight: 700,
                          color: currentChord === idx ? 'var(--gold-bright)' : 'var(--gold)',
                        }}>
                          {chord}
                        </span>
                        <span style={{
                          fontSize: '0.6rem', letterSpacing: '0.2em',
                          color: 'var(--cream-muted)', textTransform: 'uppercase',
                        }}>
                          #{idx + 1} · Remove
                        </span>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              </LayoutGroup>
            </div>
          )}

          {/* Live chord diagram (bottom of left column) */}
          <AnimatePresence>
            {activeChord && isPlaying && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                style={{
                  marginTop: '12px', padding: '12px',
                  background: 'rgba(0,196,180,0.08)', border: '1px solid var(--gold-border-mid)',
                  display: 'flex', gap: '14px', alignItems: 'center', flexShrink: 0,
                }}
              >
                <ChordDiagram chord={activeChord} />
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--gold-bright)', letterSpacing: '0.04em' }}>{activeChord.name}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--gold-dim)', letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: '2px' }}>{activeChord.type}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── RIGHT 70%: All options ── */}
        <div className="prog-col-right" style={{
          border: '1px solid var(--gold-border)',
          background: 'var(--bg-surface)',
          padding: '18px',
          display: 'flex', flexDirection: 'column', gap: '18px',
          minHeight: 0, overflow: 'auto',
          WebkitOverflowScrolling: 'touch' as const,
        }}>
          {/* Name + BPM row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'end' }}>
            <div>
              <label style={labelStyle}>Progression Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Am – F – C – G"
                style={{
                  width: '100%', padding: '10px 14px', fontSize: '1rem',
                  background: 'var(--bg-input)', border: '1px solid var(--gold-border-mid)',
                  color: 'var(--cream)', outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--gold)'; }}
                onBlur={(e)  => { e.target.style.borderColor = 'var(--gold-border-mid)'; }}
              />
            </div>
            <div>
              <label style={labelStyle}>BPM</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={() => setBpm((b) => Math.max(40, b - 5))} style={bpmNudge}>−</button>
                <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--gold-bright)', minWidth: '44px', textAlign: 'center' }}>{bpm}</span>
                <button onClick={() => setBpm((b) => Math.min(240, b + 5))} style={bpmNudge}>+</button>
              </div>
            </div>
          </div>

          {/* Chord picker */}
          <div>
            <label style={labelStyle}>Add Chord — Root</label>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {ROOTS.map((root) => {
                const active = selectedRoot === root;
                return (
                  <motion.button
                    key={root}
                    whileHover={{ scale: 1.08, y: -1 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setSelectedRoot(root)}
                    style={{
                      padding: '7px 11px', minHeight: '38px', minWidth: '42px',
                      fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${active ? 'var(--gold)' : 'var(--gold-border)'}`,
                      background: active ? 'rgba(0,196,180,0.18)' : 'transparent',
                      color: active ? 'var(--gold-bright)' : 'var(--cream-muted)',
                    }}
                  >
                    {root}
                  </motion.button>
                );
              })}
            </div>

            <label style={labelStyle}>Quality</label>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {SUFFIXES.map((s) => {
                const active = selectedSuffix === s.value;
                return (
                  <motion.button
                    key={s.value}
                    whileHover={{ scale: 1.08, y: -1 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setSelectedSuffix(s.value)}
                    style={{
                      padding: '6px 11px', minHeight: '34px',
                      fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.05em', cursor: 'pointer',
                      border: `1px solid ${active ? 'var(--gold)' : 'var(--gold-border)'}`,
                      background: active ? 'rgba(0,196,180,0.18)' : 'transparent',
                      color: active ? 'var(--gold-bright)' : 'var(--cream-muted)',
                    }}
                  >
                    {s.label}
                  </motion.button>
                );
              })}
            </div>

            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleAddChord}
              style={{
                padding: '12px 26px', minHeight: '48px', width: '100%',
                fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
                cursor: 'pointer', border: '1px solid var(--gold-border-mid)',
                background: 'linear-gradient(135deg, rgba(0,130,120,0.6), rgba(0,90,83,0.4))',
                color: 'var(--gold-bright)',
              }}
            >
              + Add Chord · {chords.length} Selected
            </motion.button>
          </div>

          {/* Playback controls */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
            <motion.button
              whileHover={chords.length > 0 ? { scale: 1.04 } : undefined}
              whileTap={chords.length > 0 ? { scale: 0.96 } : undefined}
              onClick={handleTogglePlay}
              disabled={chords.length === 0}
              style={{
                padding: '12px 28px', minHeight: '48px',
                fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
                cursor: chords.length === 0 ? 'not-allowed' : 'pointer',
                border: `2px solid ${isPlaying ? 'var(--gold-bright)' : 'var(--gold-border-mid)'}`,
                background: isPlaying ? 'rgba(0,196,180,0.15)' : 'linear-gradient(135deg, rgba(0,130,120,0.4), rgba(0,90,83,0.2))',
                color: isPlaying ? 'var(--gold-bright)' : 'var(--cream)',
                boxShadow: isPlaying ? '0 0 24px rgba(0,196,180,0.2)' : 'none',
                opacity: chords.length === 0 ? 0.4 : 1,
              }}
            >
              {isPlaying ? '⏹ Stop' : '▶ Play Loop'}
            </motion.button>

            <div>
              <label style={{ ...labelStyle, marginBottom: '4px' }}>Beats / chord</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {BEATS_OPTIONS.map((b) => {
                  const active = beatsPerChord === b;
                  return (
                    <motion.button
                      key={b}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setBeatsPerChord(b)}
                      style={{
                        padding: '7px 13px', minHeight: '34px', fontSize: '0.82rem', fontWeight: 600,
                        cursor: 'pointer',
                        border: `1px solid ${active ? 'var(--gold)' : 'var(--gold-border)'}`,
                        background: active ? 'rgba(0,196,180,0.15)' : 'transparent',
                        color: active ? 'var(--gold-bright)' : 'var(--cream-muted)',
                      }}
                    >
                      {b}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--cream-muted)', letterSpacing: '0.1em' }}>
              {bpm} BPM · {getTempoName(bpm)}
            </div>
          </div>

          {/* Instrument + drums */}
          <div>
            <label style={labelStyle}>Sound</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {INSTRUMENTS.map((inst) => {
                const active = instrument === inst.id;
                return (
                  <motion.button
                    key={inst.id}
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setInstrument(inst.id)}
                    style={{
                      padding: '7px 13px', minHeight: '38px',
                      fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${active ? 'var(--gold)' : 'var(--gold-border)'}`,
                      background: active ? 'rgba(0,196,180,0.15)' : 'transparent',
                      color: active ? 'var(--gold-bright)' : 'var(--cream-muted)',
                    }}
                  >
                    {inst.icon} {inst.label}
                  </motion.button>
                );
              })}
              <motion.button
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDrumsOn((d) => !d)}
                style={{
                  padding: '7px 13px', minHeight: '38px',
                  fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${drumsOn ? 'var(--gold)' : 'var(--gold-border)'}`,
                  background: drumsOn ? 'rgba(0,196,180,0.15)' : 'transparent',
                  color: drumsOn ? 'var(--gold-bright)' : 'var(--cream-muted)',
                }}
              >
                🥁 Drums
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .prog-builder-grid {
          grid-template-columns: 30% 1fr;
        }
        @media (max-width: 880px) {
          .prog-builder-root {
            height: auto !important;
          }
          .prog-builder-grid {
            grid-template-columns: 1fr;
          }
          .prog-col-left,
          .prog-col-right {
            overflow: visible !important;
          }
        }
      `}</style>
    </div>
  );
}

const bpmNudge: React.CSSProperties = {
  padding: '8px 12px', minHeight: '38px',
  border: '1px solid var(--gold-border)', background: 'transparent',
  color: 'var(--cream-muted)', cursor: 'pointer', fontSize: '0.95rem',
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProgressionBuilder() {
  const [progressions,  setProgressions]  = useState<Progression[]>([]);
  const [view,          setView]          = useState<'list' | 'builder'>('list');
  const [active,        setActive]        = useState<Progression | null>(null);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    loadProgressions().then((p) => { setProgressions(p); setLoading(false); });
  }, []);

  const handleSave = async (name: string, chords: string[], bpm: number) => {
    if (active) {
      await updateProgression(active.id, { name, chords, bpm });
      setActive({ ...active, name, chords, bpm });
      const updated = await loadProgressions();
      setProgressions(updated);
    } else {
      const updated = await addProgression(name, chords, bpm);
      setProgressions(updated);
      setActive(updated[0]);
    }
  };

  const handleDelete = async () => {
    if (!active) return;
    const updated = await deleteProgression(active.id);
    setProgressions(updated);
    setView('list');
    setActive(null);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--cream-muted)', fontSize: '1rem', letterSpacing: '0.1em' }}>Loading…</div>;
  }

  if (view === 'builder') {
    return (
      <BuilderView
        progression={active}
        onSave={handleSave}
        onDelete={active ? handleDelete : null}
        onBack={() => { setView('list'); setActive(null); }}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
        <GoldBtn onClick={() => { setActive(null); setView('builder'); }} style={{ padding: '12px 36px' }}>
          + New Progression
        </GoldBtn>
      </div>

      {progressions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', fontSize: '1.05rem', fontStyle: 'italic', color: 'var(--cream-muted)', lineHeight: 1.7 }}>
          No progressions yet.<br />
          <span style={{ fontSize: '0.9rem' }}>Create one to start building chord sequences.</span>
        </div>
      ) : (
        <LayoutGroup>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            <AnimatePresence>
              {progressions.map((prog, i) => (
                <ProgressionCard
                  key={prog.id}
                  prog={prog}
                  index={i}
                  onClick={() => { setActive(prog); setView('builder'); }}
                />
              ))}
            </AnimatePresence>
          </div>
        </LayoutGroup>
      )}
    </div>
  );
}
