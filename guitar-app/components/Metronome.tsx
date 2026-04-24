'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { getTempoName } from '@/lib/transpose';

interface MetronomeProps {
  initialBpm?: number;
  onBpmChange?: (bpm: number) => void;
}

// ── Time Signature Presets ───────────────────────────────────────────────────
interface TimeSig {
  id: string;
  label: string;
  beats: number;
  // default accent pattern — true = accented click on that beat
  defaults: boolean[];
}
const TIME_SIGS: TimeSig[] = [
  { id: '2/4', label: '2/4', beats: 2, defaults: [true, false] },
  { id: '3/4', label: '3/4', beats: 3, defaults: [true, false, false] },
  { id: '4/4', label: '4/4', beats: 4, defaults: [true, false, false, false] },
  { id: '5/4', label: '5/4', beats: 5, defaults: [true, false, false, true, false] },
  { id: '6/8', label: '6/8', beats: 6, defaults: [true, false, false, true, false, false] },
  { id: '7/8', label: '7/8', beats: 7, defaults: [true, false, true, false, true, false, false] },
];

export default function Metronome({ initialBpm = 120, onBpmChange }: MetronomeProps) {
  const [bpm, setBpm]       = useState(initialBpm);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beat, setBeat]     = useState(-1);
  const [timeSigId, setTimeSigId] = useState('4/4');
  const [accents, setAccents] = useState<boolean[]>([...TIME_SIGS[2].defaults]);

  const timeSig = TIME_SIGS.find((t) => t.id === timeSigId) ?? TIME_SIGS[2];
  const beatsPerBar = timeSig.beats;

  const audioCtxRef   = useRef<AudioContext | null>(null);
  const nextNoteRef   = useRef(0);
  const beatCountRef  = useRef(0);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const bpmRef        = useRef(bpm);
  const accentsRef    = useRef(accents);
  const beatsPerBarRef = useRef(beatsPerBar);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { accentsRef.current = accents; }, [accents]);
  useEffect(() => { beatsPerBarRef.current = beatsPerBar; }, [beatsPerBar]);

  // Sync accents when time sig changes
  useEffect(() => {
    setAccents([...timeSig.defaults]);
  }, [timeSigId]); // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleClick = useCallback((time: number, accent: boolean) => {
    const ctx = audioCtxRef.current!;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.value = accent ? 1400 : 800;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(accent ? 0.55 : 0.28, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
    osc.start(time);
    osc.stop(time + 0.06);
  }, []);

  const tick = useCallback(() => {
    const ctx = audioCtxRef.current!;
    const LOOKAHEAD = 0.1;
    while (nextNoteRef.current < ctx.currentTime + LOOKAHEAD) {
      const beatInBar = beatCountRef.current % beatsPerBarRef.current;
      const accent = accentsRef.current[beatInBar] ?? false;
      scheduleClick(nextNoteRef.current, accent);
      const delay = Math.max(0, (nextNoteRef.current - ctx.currentTime) * 1000);
      const captured = beatInBar;
      setTimeout(() => setBeat(captured), delay);
      beatCountRef.current++;
      nextNoteRef.current += 60 / bpmRef.current;
    }
  }, [scheduleClick]);

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
    setIsPlaying(true);
  }, [tick]);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPlaying(false);
    setBeat(-1);
  }, []);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  // Tap tempo
  const tapTimesRef = useRef<number[]>([]);
  const handleTap = () => {
    const now = Date.now();
    tapTimesRef.current = [...tapTimesRef.current.filter((t) => now - t < 3000), now];
    if (tapTimesRef.current.length >= 2) {
      const diffs = tapTimesRef.current.slice(1).map((t, i) => t - tapTimesRef.current[i]);
      const avg   = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      const newBpm = Math.round(Math.min(240, Math.max(40, 60000 / avg)));
      setBpm(newBpm);
      onBpmChange?.(newBpm);
    }
  };

  const handleBpm = (v: number) => {
    const clamped = Math.min(240, Math.max(40, v));
    setBpm(clamped);
    onBpmChange?.(clamped);
  };

  const toggleAccent = (idx: number) => {
    setAccents((prev) => prev.map((a, i) => (i === idx ? !a : a)));
  };

  const tempoName = getTempoName(bpm);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px' }}>

      {/* Time Signature selector */}
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <div style={{
          fontSize: '0.6rem', letterSpacing: '0.4em', color: 'var(--gold-dim)',
          textTransform: 'uppercase', marginBottom: '8px', textAlign: 'center',
        }}>
          Time Signature
        </div>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {TIME_SIGS.map((ts) => {
            const active = ts.id === timeSigId;
            return (
              <button
                key={ts.id}
                onClick={() => setTimeSigId(ts.id)}
                style={{
                  padding: '10px 18px', minHeight: '44px', minWidth: '56px',
                  fontSize: '1rem', fontWeight: 700, letterSpacing: '0.05em',
                  cursor: 'pointer',
                  border: `1px solid ${active ? 'var(--gold-bright)' : 'var(--gold-border)'}`,
                  background: active ? 'rgba(0,232,213,0.15)' : 'transparent',
                  color: active ? 'var(--gold-bright)' : 'var(--cream-muted)',
                  transition: 'all 0.12s',
                }}
              >
                {ts.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Beat dots — CLICKABLE: toggle accent per beat */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{
          fontSize: '0.58rem', letterSpacing: '0.35em', color: 'var(--gold-dim)',
          textTransform: 'uppercase',
        }}>
          Tap a beat to add/remove accent
        </div>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          {Array.from({ length: beatsPerBar }).map((_, i) => {
            const active = beat === i;
            const accent = accents[i] ?? false;
            return (
              <button
                key={i}
                onClick={() => toggleAccent(i)}
                title={`Beat ${i + 1} — ${accent ? 'accented' : 'normal'} (click to toggle)`}
                style={{
                  width:  active ? (accent ? 30 : 24) : (accent ? 26 : 20),
                  height: active ? (accent ? 30 : 24) : (accent ? 26 : 20),
                  borderRadius: '50%', padding: 0, cursor: 'pointer',
                  background: active
                    ? (accent ? 'var(--gold-bright)' : 'var(--gold)')
                    : (accent ? 'rgba(0,232,213,0.22)' : 'var(--bg-card)'),
                  border: `2px solid ${active ? (accent ? 'var(--gold-bright)' : 'var(--gold)') : (accent ? 'var(--gold-bright)' : 'var(--gold-border-mid)')}`,
                  boxShadow: active
                    ? `0 0 ${accent ? 20 : 12}px ${accent ? 'rgba(0,232,213,0.7)' : 'rgba(0,196,180,0.5)'}`
                    : 'none',
                  transition: 'all 0.06s ease-out',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* BPM display */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 'clamp(4.5rem, 13vw, 8rem)',
          fontWeight: 700, lineHeight: 1,
          color: isPlaying ? 'var(--gold-bright)' : 'var(--cream)',
          letterSpacing: '-0.03em',
          textShadow: isPlaying ? '0 0 60px rgba(0,232,213,0.3)' : 'none',
          transition: 'color 0.3s, text-shadow 0.3s',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {bpm}
        </div>
        <div style={{
          fontSize: '0.72rem', letterSpacing: '0.4em', textTransform: 'uppercase',
          color: 'var(--gold-dim)', marginTop: '4px',
        }}>
          BPM · {tempoName} · {timeSig.label}
        </div>
      </div>

      {/* BPM slider */}
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <input
          type="range" min={40} max={240} step={1}
          value={bpm}
          onChange={(e) => handleBpm(Number(e.target.value))}
          style={{
            width: '100%', height: '4px', accentColor: 'var(--gold)',
            cursor: 'pointer', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--cream-muted)', letterSpacing: '0.15em' }}>40</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--cream-muted)', letterSpacing: '0.15em' }}>240</span>
        </div>
      </div>

      {/* BPM presets */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[60, 80, 100, 120, 140, 160].map((preset) => (
          <button
            key={preset}
            onClick={() => handleBpm(preset)}
            style={{
              padding: '8px 16px', minHeight: '36px',
              fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.1em',
              cursor: 'pointer',
              border: `1px solid ${bpm === preset ? 'var(--gold)' : 'var(--gold-border)'}`,
              background: bpm === preset ? 'rgba(0,196,180,0.12)' : 'transparent',
              color: bpm === preset ? 'var(--gold-bright)' : 'var(--cream-muted)',
              transition: 'all 0.15s',
            }}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Controls — big, visible Start button */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={handleTap} style={{
          padding: '14px 28px', minHeight: '60px',
          fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.22em',
          textTransform: 'uppercase', cursor: 'pointer',
          border: '1px solid var(--gold-border-mid)',
          background: 'rgba(0,196,180,0.05)', color: 'var(--cream-soft)',
          transition: 'all 0.1s',
        }}>
          Tap
        </button>

        {/* BIG Start/Stop */}
        <button
          onClick={isPlaying ? stop : start}
          style={{
            width: '130px', height: '130px', borderRadius: '50%',
            fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.25em',
            textTransform: 'uppercase', cursor: 'pointer',
            border: `3px solid ${isPlaying ? 'var(--red-tuning)' : 'var(--gold-bright)'}`,
            background: isPlaying
              ? 'linear-gradient(135deg, rgba(224,72,72,0.35), rgba(224,72,72,0.15))'
              : 'linear-gradient(135deg, rgba(0,232,213,0.4), rgba(0,130,120,0.25))',
            color: isPlaying ? 'var(--red-tuning)' : 'var(--gold-bright)',
            boxShadow: isPlaying
              ? '0 0 40px rgba(224,72,72,0.4), inset 0 0 20px rgba(224,72,72,0.15)'
              : '0 0 48px rgba(0,232,213,0.45), inset 0 0 20px rgba(0,232,213,0.12)',
            transition: 'all 0.2s',
            textShadow: '0 0 12px currentColor',
          }}
        >
          {isPlaying ? '◼ Stop' : '▶ Start'}
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => handleBpm(bpm + 1)} style={nudgeBtn}>＋</button>
          <button onClick={() => handleBpm(bpm - 1)} style={nudgeBtn}>－</button>
        </div>
      </div>
    </div>
  );
}

const nudgeBtn: React.CSSProperties = {
  width: '48px', height: '48px',
  fontSize: '1.2rem', cursor: 'pointer',
  border: '1px solid var(--gold-border-mid)',
  background: 'rgba(0,196,180,0.08)', color: 'var(--gold-bright)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s',
};
