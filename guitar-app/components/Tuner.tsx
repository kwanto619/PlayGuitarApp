'use client';

import { useState, useEffect, useRef } from 'react';

const noteStrings = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// ── Analog Meter SVG ────────────────────────────────────────────────────────
function MeterSVG({ cents, status }: { cents: number; status: string }) {
  const CX = 160, CY = 160, R = 118;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const pt = (deg: number, r: number) => ({
    x: CX + r * Math.cos(toRad(deg)),
    y: CY + r * Math.sin(toRad(deg)),
  });

  // Arc from 210° (upper-left / flat) to 330° (upper-right / sharp)
  // Center at 270° (straight up) = in tune
  const arcStart  = pt(210, R);
  const arcEnd    = pt(330, R);
  const greenS    = pt(258, R); // ±10 cents zone start
  const greenE    = pt(282, R); // ±10 cents zone end

  const clampedCents   = Math.max(-50, Math.min(50, cents));
  const needleRotation = (clampedCents / 50) * 60; // degrees from 12-o'clock

  const isInTune   = status === 'tuned';
  const needleColor =
    status === 'tuned' ? '#50e880' :
    status === 'flat'  ? '#4488cc' :
    status === 'sharp' ? '#e04848' :
    '#5a4418';

  const majorTicks = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];
  const minorTicks = [-45, -35, -25, -15, -5, 5, 15, 25, 35, 45];

  const arc = (s: { x: number; y: number }, e: { x: number; y: number }) =>
    `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;

  return (
    <svg
      viewBox="0 0 320 175"
      style={{ width: '100%', maxWidth: '420px', display: 'block', margin: '0 auto' }}
    >
      {/* Track arc — muted background */}
      <path d={arc(arcStart, arcEnd)} fill="none" stroke="rgba(200,152,32,0.1)" strokeWidth="18" strokeLinecap="round" />

      {/* Flat zone */}
      <path d={arc(arcStart, greenS)} fill="none" stroke="rgba(68,136,204,0.18)" strokeWidth="18" />
      {/* Sharp zone */}
      <path d={arc(greenE, arcEnd)}   fill="none" stroke="rgba(224,72,72,0.18)"  strokeWidth="18" />
      {/* Green center zone */}
      <path
        d={arc(greenS, greenE)}
        fill="none"
        stroke={isInTune ? 'rgba(80,232,128,0.85)' : 'rgba(80,232,128,0.22)'}
        strokeWidth="18"
        style={{ transition: 'stroke 0.2s' }}
      />

      {/* Major tick marks */}
      {majorTicks.map((c) => {
        const deg   = 270 + (c / 50) * 60;
        const inner = pt(deg, R - 24);
        const outer = pt(deg, R + 10);
        return (
          <line
            key={c}
            x1={inner.x.toFixed(2)} y1={inner.y.toFixed(2)}
            x2={outer.x.toFixed(2)} y2={outer.y.toFixed(2)}
            stroke={c === 0 ? 'rgba(80,232,128,0.5)' : 'rgba(200,152,32,0.28)'}
            strokeWidth={c === 0 ? 2 : 1.2}
          />
        );
      })}

      {/* Minor tick marks */}
      {minorTicks.map((c) => {
        const deg   = 270 + (c / 50) * 60;
        const inner = pt(deg, R - 10);
        const outer = pt(deg, R + 3);
        return (
          <line
            key={c}
            x1={inner.x.toFixed(2)} y1={inner.y.toFixed(2)}
            x2={outer.x.toFixed(2)} y2={outer.y.toFixed(2)}
            stroke="rgba(200,152,32,0.12)"
            strokeWidth="0.8"
          />
        );
      })}

      {/* Needle — translated to center, then rotated */}
      <g style={{
        transform: `translate(${CX}px, ${CY}px) rotate(${needleRotation}deg)`,
        transition: 'transform 0.12s ease-out',
      }}>
        <line x1="0" y1="4" x2="0" y2={-(R - 10)} stroke={needleColor} strokeWidth="1.5" strokeLinecap="round" style={{ transition: 'stroke 0.2s' }} />
        <polygon
          points={`0,${-(R - 10)} -3,${-(R - 20)} 3,${-(R - 20)}`}
          fill={needleColor}
          style={{ transition: 'fill 0.2s' }}
        />
      </g>

      {/* Pivot */}
      <circle cx={CX} cy={CY} r="6"   fill="var(--bg-surface)" />
      <circle cx={CX} cy={CY} r="3.5" fill={needleColor} style={{ transition: 'fill 0.2s' }} />

      {/* Zone labels */}
      <text x="34"  y="106" fill="rgba(68,136,204,0.45)"  fontSize="7.5" fontFamily="Georgia,serif" letterSpacing="2" textAnchor="middle">FLAT</text>
      <text x="286" y="106" fill="rgba(224,72,72,0.45)"   fontSize="7.5" fontFamily="Georgia,serif" letterSpacing="2" textAnchor="middle">SHARP</text>
      <text x={CX}  y="106" fill="rgba(80,232,128,0.4)"  fontSize="8"   fontFamily="Georgia,serif" letterSpacing="1" textAnchor="middle">IN TUNE</text>
    </svg>
  );
}

// ── Panel wrapper helpers ────────────────────────────────────────────────────
const corners: React.CSSProperties[] = [
  { top: 8, left: 8,   borderTop:    '1px solid var(--gold-border-mid)', borderLeft:   '1px solid var(--gold-border-mid)' },
  { top: 8, right: 8,  borderTop:    '1px solid var(--gold-border-mid)', borderRight:  '1px solid var(--gold-border-mid)' },
  { bottom: 8, left: 8,  borderBottom: '1px solid var(--gold-border-mid)', borderLeft:   '1px solid var(--gold-border-mid)' },
  { bottom: 8, right: 8, borderBottom: '1px solid var(--gold-border-mid)', borderRight:  '1px solid var(--gold-border-mid)' },
];

// ── Main Component ───────────────────────────────────────────────────────────
export default function Tuner() {
  const [isListening, setIsListening] = useState(false);
  const [note,        setNote]        = useState('—');
  const [frequency,   setFrequency]   = useState(0);
  const [cents,       setCents]       = useState(0);
  const [status,      setStatus]      = useState<'tuned' | 'sharp' | 'flat' | 'idle'>('idle');

  const audioContextRef  = useRef<AudioContext | null>(null);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const microphoneRef    = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafIdRef         = useRef<number | null>(null);
  const pitchBufferRef   = useRef<number[]>([]);
  const isListeningRef   = useRef(false);

  const minVolume    = 0.005;
  const minConfidence = 0.85;
  const bufferSize   = 5;

  const autoCorrelate = (buffer: Float32Array, sampleRate: number): number => {
    const SIZE = buffer.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < minVolume) return -1;

    const threshold = 0.2;
    let r1 = 0;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buffer[i]) < threshold) { r1 = i; break; }
    }
    void r1;

    const correlations = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++)
      for (let j = 0; j < SIZE - i; j++)
        correlations[i] += buffer[j] * buffer[j + i];

    let d = 0;
    while (correlations[d] > correlations[d + 1]) d++;

    let maxval = -1, maxpos = -1;
    for (let i = d; i < SIZE / 2; i++) {
      if (correlations[i] > maxval) { maxval = correlations[i]; maxpos = i; }
    }

    let T0 = maxpos;
    if (T0 > 0 && T0 < SIZE - 1) {
      const x1 = correlations[T0 - 1], x2 = correlations[T0], x3 = correlations[T0 + 1];
      const a = (x1 + x3 - 2 * x2) / 2, b = (x3 - x1) / 2;
      if (a) T0 = T0 - b / (2 * a);
    }

    if (maxval / correlations[0] < minConfidence) return -1;
    return sampleRate / T0;
  };

  const noteFromPitch = (f: number) => Math.round(12 * (Math.log(f / 440) / Math.log(2))) + 69;
  const freqFromNote  = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
  const centsOff = (f: number, n: number) => Math.floor(1200 * Math.log(f / freqFromNote(n)) / Math.log(2));

  const updatePitch = () => {
    if (!analyserRef.current || !isListeningRef.current) return;

    const buffer = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buffer);
    const pitch = autoCorrelate(buffer, audioContextRef.current!.sampleRate);

    if (pitch > 60 && pitch < 1000) {
      pitchBufferRef.current.push(pitch);
      if (pitchBufferRef.current.length > bufferSize) pitchBufferRef.current.shift();

      const sorted = [...pitchBufferRef.current].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const noteNum  = noteFromPitch(median);
      const noteName = noteStrings[noteNum % 12];
      const octave   = Math.floor(noteNum / 12) - 1;
      const c        = centsOff(median, noteNum);

      setNote(noteName + octave);
      setFrequency(median);
      setCents(c);
      setStatus(Math.abs(c) <= 2 ? 'tuned' : c < 0 ? 'flat' : 'sharp');
    } else {
      pitchBufferRef.current = [];
    }

    if (isListeningRef.current) rafIdRef.current = requestAnimationFrame(updatePitch);
  };

  const toggleTuner = async () => {
    if (!isListening) {
      try {
        if (!audioContextRef.current) {
          const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioContextRef.current = new AC();
        }
        if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: 44100 },
        });

        microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current   = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 8192;
        analyserRef.current.smoothingTimeConstant = 0.8;
        microphoneRef.current.connect(analyserRef.current);

        isListeningRef.current = true;
        setIsListening(true);
        pitchBufferRef.current = [];
        updatePitch();
      } catch (error) {
        alert('Microphone error: ' + (error as Error).message);
      }
    } else {
      stopTuner();
    }
  };

  const stopTuner = () => {
    isListeningRef.current = false;
    setIsListening(false);
    setNote('—');
    setFrequency(0);
    setCents(0);
    setStatus('idle');
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      const src = microphoneRef.current as MediaStreamAudioSourceNode & { mediaStream: MediaStream };
      src.mediaStream?.getTracks().forEach((t) => t.stop());
    }
  };

  useEffect(() => () => { stopTuner(); }, []);

  const noteColor =
    status === 'tuned' ? 'var(--phosphor)' :
    status === 'flat'  ? 'var(--blue-tuning)' :
    status === 'sharp' ? 'var(--red-tuning)' :
    'var(--cream-muted)';

  const noteGlow =
    status === 'tuned' ? '0 0 24px rgba(80,232,128,0.7), 0 0 60px rgba(80,232,128,0.3)' :
    isListening        ? '0 0 20px rgba(200,152,32,0.25)' :
    'none';

  return (
    <div style={{ maxWidth: '580px', margin: '0 auto' }}>
      <div style={{
        border: '1px solid var(--gold-border)',
        background: 'var(--bg-surface)',
        padding: 'clamp(28px, 5vw, 48px) clamp(24px, 4vw, 40px)',
        position: 'relative',
        boxShadow: '0 12px 56px rgba(0,0,0,0.75), inset 0 1px 0 rgba(200,152,32,0.07)',
      }}>
        {/* Corner brackets */}
        {corners.map((s, i) => (
          <div key={i} style={{ position: 'absolute', width: 22, height: 22, ...s }} />
        ))}

        {/* Section label */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '0.58rem', letterSpacing: '0.5em', color: 'var(--gold-dim)', textTransform: 'uppercase', marginBottom: '5px' }}>
            Precision Instrument
          </div>
          <h2 style={{
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: '2rem',
            fontWeight: 500,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            margin: 0,
          }}>
            Chromatic Tuner
          </h2>
        </div>

        {/* Note display */}
        <div style={{ textAlign: 'center', minHeight: '110px', marginBottom: '8px' }}>
          <div style={{
            fontFamily: 'var(--font-ibm-mono, monospace)',
            fontSize: 'clamp(4rem, 10vw, 6rem)',
            fontWeight: 600,
            lineHeight: 1,
            color: noteColor,
            textShadow: noteGlow,
            transition: 'color 0.2s, text-shadow 0.2s',
            letterSpacing: '-0.02em',
            className: isListening && status === 'tuned' ? 'phosphor-pulse' : '',
          } as React.CSSProperties}>
            {note}
          </div>
          <div style={{
            fontFamily: 'var(--font-ibm-mono, monospace)',
            fontSize: '0.95rem',
            color: 'var(--cream-muted)',
            letterSpacing: '0.12em',
            marginTop: '8px',
            minHeight: '22px',
          }}>
            {isListening && frequency > 0 ? `${frequency.toFixed(1)} Hz` : ''}
          </div>
        </div>

        {/* Analog meter */}
        <MeterSVG cents={cents} status={status} />

        {/* Status text */}
        <div style={{ textAlign: 'center', marginTop: '16px', minHeight: '42px' }}>
          {isListening && (
            <div style={{
              fontFamily: 'var(--font-cormorant, Georgia, serif)',
              fontSize: '1.4rem',
              fontWeight: 500,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: noteColor,
              textShadow: status === 'tuned' ? '0 0 20px rgba(80,232,128,0.5)' : 'none',
              transition: 'color 0.2s, text-shadow 0.2s',
            }}>
              {status === 'tuned' && '✓ In Tune'}
              {status === 'flat'  && `Tune Up  ↑  ${cents}¢`}
              {status === 'sharp' && `Tune Down  ↓  +${cents}¢`}
            </div>
          )}
        </div>

        {/* Start / Stop button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
          <button
            onClick={toggleTuner}
            style={{
              padding: '13px 52px',
              fontFamily: 'var(--font-cormorant, Georgia, serif)',
              fontSize: '1rem',
              fontWeight: 600,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              border: isListening
                ? '1px solid rgba(224,72,72,0.55)'
                : '1px solid var(--gold-border-mid)',
              background: isListening
                ? 'linear-gradient(135deg, rgba(224,72,72,0.12), rgba(224,72,72,0.06))'
                : 'linear-gradient(135deg, rgba(122,92,16,0.6), rgba(90,68,24,0.4))',
              color: isListening ? 'var(--red-tuning)' : 'var(--gold-bright)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {isListening ? '◼  Stop' : '●  Start Tuner'}
          </button>
        </div>

        {/* Footer rule */}
        <div style={{
          marginTop: '28px',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, var(--gold-border-mid), transparent)',
        }} />
        <div style={{
          textAlign: 'center',
          marginTop: '10px',
          fontSize: '0.52rem',
          letterSpacing: '0.45em',
          color: 'var(--cream-muted)',
          opacity: 0.45,
          textTransform: 'uppercase',
        }}>
          A · 440 Hz · Standard Tuning
        </div>
      </div>
    </div>
  );
}
