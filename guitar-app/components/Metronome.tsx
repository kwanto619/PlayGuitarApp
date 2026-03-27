'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { getTempoName } from '@/lib/transpose';

interface MetronomeProps {
  initialBpm?: number;
  onBpmChange?: (bpm: number) => void;
}

export default function Metronome({ initialBpm = 120, onBpmChange }: MetronomeProps) {
  const [bpm, setBpm]         = useState(initialBpm);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beat, setBeat]       = useState(-1); // 0-3, -1 = stopped
  const [beatsPerBar]         = useState(4);

  const audioCtxRef    = useRef<AudioContext | null>(null);
  const nextNoteRef    = useRef(0);
  const beatCountRef   = useRef(0);
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const bpmRef         = useRef(bpm);
  const beatsPerBarRef = useRef(beatsPerBar);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  const scheduleClick = useCallback((time: number, accent: boolean) => {
    const ctx = audioCtxRef.current!;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.value = accent ? 1200 : 800;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(accent ? 0.5 : 0.3, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
    osc.start(time);
    osc.stop(time + 0.06);
  }, []);

  const tick = useCallback(() => {
    const ctx = audioCtxRef.current!;
    const LOOKAHEAD = 0.1;

    while (nextNoteRef.current < ctx.currentTime + LOOKAHEAD) {
      const beatInBar = beatCountRef.current % beatsPerBarRef.current;
      scheduleClick(nextNoteRef.current, beatInBar === 0);

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

  const tempoName = getTempoName(bpm);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px' }}>

      {/* Beat dots */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {Array.from({ length: beatsPerBar }).map((_, i) => {
          const active  = beat === i;
          const accent  = i === 0;
          return (
            <div key={i} style={{
              width:  active ? (accent ? 26 : 22) : (accent ? 20 : 16),
              height: active ? (accent ? 26 : 22) : (accent ? 20 : 16),
              borderRadius: '50%',
              background: active
                ? (accent ? 'var(--gold-bright)' : 'var(--gold)')
                : 'var(--bg-card)',
              border: `2px solid ${active ? (accent ? 'var(--gold-bright)' : 'var(--gold)') : 'var(--gold-border-mid)'}`,
              boxShadow: active ? `0 0 ${accent ? 20 : 12}px ${accent ? 'rgba(0,232,213,0.7)' : 'rgba(0,196,180,0.5)'}` : 'none',
              transition: 'all 0.06s ease-out',
            }} />
          );
        })}
      </div>

      {/* BPM display */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 'clamp(5rem, 15vw, 9rem)',
          fontWeight: 700,
          lineHeight: 1,
          color: isPlaying ? 'var(--gold-bright)' : 'var(--cream)',
          letterSpacing: '-0.03em',
          textShadow: isPlaying ? '0 0 60px rgba(0,232,213,0.3)' : 'none',
          transition: 'color 0.3s, text-shadow 0.3s',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {bpm}
        </div>
        <div style={{
          fontSize: '0.75rem', letterSpacing: '0.4em', textTransform: 'uppercase',
          color: 'var(--gold-dim)', marginTop: '4px',
        }}>
          BPM · {tempoName}
        </div>
      </div>

      {/* BPM Slider */}
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <input
          type="range"
          min={40} max={240} step={1}
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

      {/* Quick BPM presets */}
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

      {/* Controls */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {/* Tap tempo */}
        <button
          onClick={handleTap}
          style={{
            padding: '14px 28px', minHeight: '52px',
            fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.2em',
            textTransform: 'uppercase', cursor: 'pointer',
            border: '1px solid var(--gold-border-mid)',
            background: 'transparent', color: 'var(--cream-soft)',
            transition: 'all 0.1s',
          }}
          onMouseDown={(e) => { e.currentTarget.style.background = 'rgba(0,196,180,0.1)'; }}
          onMouseUp={(e)   => { e.currentTarget.style.background = 'transparent'; }}
        >
          Tap
        </button>

        {/* Start / Stop */}
        <button
          onClick={isPlaying ? stop : start}
          style={{
            width: '96px', height: '96px', borderRadius: '50%',
            fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.2em',
            textTransform: 'uppercase', cursor: 'pointer',
            border: `2px solid ${isPlaying ? 'var(--gold-bright)' : 'var(--gold-border-mid)'}`,
            background: isPlaying
              ? 'linear-gradient(135deg, rgba(0,196,180,0.25), rgba(0,130,120,0.15))'
              : 'linear-gradient(135deg, rgba(0,130,120,0.2), rgba(0,90,83,0.1))',
            color: isPlaying ? 'var(--gold-bright)' : 'var(--cream)',
            boxShadow: isPlaying ? '0 0 32px rgba(0,196,180,0.25)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {isPlaying ? 'Stop' : 'Start'}
        </button>

        {/* +/- fine adjust */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button onClick={() => handleBpm(bpm + 1)} style={nudgeBtn}>＋</button>
          <button onClick={() => handleBpm(bpm - 1)} style={nudgeBtn}>－</button>
        </div>
      </div>
    </div>
  );
}

const nudgeBtn: React.CSSProperties = {
  width: '40px', height: '40px',
  fontSize: '1.1rem', cursor: 'pointer',
  border: '1px solid var(--gold-border)',
  background: 'transparent', color: 'var(--cream-muted)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s',
};
