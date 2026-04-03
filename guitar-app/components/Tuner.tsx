'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const noteStrings = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Standard guitar string targets
const GUITAR_STRINGS = [
  { name: 'E2', note: 'E', octave: 2, freq: 82.41 },
  { name: 'A2', note: 'A', octave: 2, freq: 110.00 },
  { name: 'D3', note: 'D', octave: 3, freq: 146.83 },
  { name: 'G3', note: 'G', octave: 3, freq: 196.00 },
  { name: 'B3', note: 'B', octave: 3, freq: 246.94 },
  { name: 'E4', note: 'E', octave: 4, freq: 329.63 },
];

// ── YIN Pitch Detection Algorithm ──────────────────────────────────────────
// Industry-standard algorithm used by professional tuners.
// Much more accurate than naive autocorrelation, especially for guitar.
function yinDetect(buffer: Float32Array, sampleRate: number): { freq: number; probability: number } {
  const THRESHOLD = 0.15;
  const halfSize = Math.floor(buffer.length / 2);

  // Step 1: Check signal level
  let rms = 0;
  for (let i = 0; i < buffer.length; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / buffer.length);
  if (rms < 0.008) return { freq: -1, probability: 0 };

  // Step 2: Difference function
  const diff = new Float32Array(halfSize);
  for (let tau = 0; tau < halfSize; tau++) {
    let sum = 0;
    for (let i = 0; i < halfSize; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    diff[tau] = sum;
  }

  // Step 3: Cumulative mean normalized difference (CMND)
  const cmnd = new Float32Array(halfSize);
  cmnd[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfSize; tau++) {
    runningSum += diff[tau];
    cmnd[tau] = diff[tau] * tau / runningSum;
  }

  // Step 4: Absolute threshold - find first dip below threshold
  let tau = 2; // min lag (corresponds to max detectable frequency)
  while (tau < halfSize) {
    if (cmnd[tau] < THRESHOLD) {
      // Walk past the dip to find the true minimum
      while (tau + 1 < halfSize && cmnd[tau + 1] < cmnd[tau]) tau++;
      break;
    }
    tau++;
  }

  if (tau >= halfSize) return { freq: -1, probability: 0 };

  // Step 5: Parabolic interpolation for sub-sample accuracy
  let betterTau = tau;
  if (tau > 0 && tau < halfSize - 1) {
    const s0 = cmnd[tau - 1];
    const s1 = cmnd[tau];
    const s2 = cmnd[tau + 1];
    const shift = (s0 - s2) / (2 * (s0 - 2 * s1 + s2));
    if (isFinite(shift)) betterTau = tau + shift;
  }

  const probability = 1 - cmnd[tau];
  const freq = sampleRate / betterTau;

  // Only accept frequencies in guitar range (drop D ~73 Hz to high fret ~1200 Hz)
  if (freq < 70 || freq > 1200) return { freq: -1, probability: 0 };

  return { freq, probability };
}

// ── Analog Meter SVG ────────────────────────────────────────────────────────
function MeterSVG({ cents, status }: { cents: number; status: string }) {
  const CX = 160, CY = 160, R = 118;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const pt = (deg: number, r: number) => ({
    x: CX + r * Math.cos(toRad(deg)),
    y: CY + r * Math.sin(toRad(deg)),
  });

  const arcStart  = pt(210, R);
  const arcEnd    = pt(330, R);
  const greenS    = pt(258, R);
  const greenE    = pt(282, R);

  const clampedCents   = Math.max(-50, Math.min(50, cents));
  const needleRotation = (clampedCents / 50) * 60;

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
      <path d={arc(arcStart, arcEnd)} fill="none" stroke="rgba(0,196,180,0.1)" strokeWidth="18" strokeLinecap="round" />
      <path d={arc(arcStart, greenS)} fill="none" stroke="rgba(68,136,204,0.18)" strokeWidth="18" />
      <path d={arc(greenE, arcEnd)}   fill="none" stroke="rgba(224,72,72,0.18)"  strokeWidth="18" />
      <path
        d={arc(greenS, greenE)}
        fill="none"
        stroke={isInTune ? 'rgba(80,232,128,0.85)' : 'rgba(80,232,128,0.22)'}
        strokeWidth="18"
        style={{ transition: 'stroke 0.2s' }}
      />

      {majorTicks.map((c) => {
        const deg   = 270 + (c / 50) * 60;
        const inner = pt(deg, R - 24);
        const outer = pt(deg, R + 10);
        return (
          <line
            key={c}
            x1={inner.x.toFixed(2)} y1={inner.y.toFixed(2)}
            x2={outer.x.toFixed(2)} y2={outer.y.toFixed(2)}
            stroke={c === 0 ? 'rgba(80,232,128,0.5)' : 'rgba(0,196,180,0.28)'}
            strokeWidth={c === 0 ? 2 : 1.2}
          />
        );
      })}

      {minorTicks.map((c) => {
        const deg   = 270 + (c / 50) * 60;
        const inner = pt(deg, R - 10);
        const outer = pt(deg, R + 3);
        return (
          <line
            key={c}
            x1={inner.x.toFixed(2)} y1={inner.y.toFixed(2)}
            x2={outer.x.toFixed(2)} y2={outer.y.toFixed(2)}
            stroke="rgba(0,196,180,0.12)"
            strokeWidth="0.8"
          />
        );
      })}

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

      <circle cx={CX} cy={CY} r="6"   fill="var(--bg-surface)" />
      <circle cx={CX} cy={CY} r="3.5" fill={needleColor} style={{ transition: 'fill 0.2s' }} />

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
  const [targetString, setTargetString] = useState<number | null>(null);
  const [detectedString, setDetectedString] = useState<number | null>(null);

  const audioContextRef  = useRef<AudioContext | null>(null);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const microphoneRef    = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafIdRef         = useRef<number | null>(null);
  const pitchBufferRef   = useRef<number[]>([]);
  const isListeningRef   = useRef(false);

  const bufferSize = 5;

  const noteFromPitch = (f: number) => Math.round(12 * (Math.log(f / 440) / Math.log(2))) + 69;
  const freqFromNote  = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
  const centsOff = (f: number, n: number) => Math.floor(1200 * Math.log(f / freqFromNote(n)) / Math.log(2));

  // Find closest guitar string to a frequency
  const closestString = (freq: number): number => {
    let minDist = Infinity, idx = 0;
    for (let i = 0; i < GUITAR_STRINGS.length; i++) {
      // Compare in cents for perceptual accuracy
      const c = Math.abs(1200 * Math.log(freq / GUITAR_STRINGS[i].freq) / Math.log(2));
      if (c < minDist) { minDist = c; idx = i; }
    }
    return idx;
  };

  const updatePitch = useCallback(() => {
    if (!analyserRef.current || !isListeningRef.current) return;

    const buffer = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buffer);
    const result = yinDetect(buffer, audioContextRef.current!.sampleRate);

    if (result.freq > 0 && result.probability > 0.8) {
      pitchBufferRef.current.push(result.freq);
      if (pitchBufferRef.current.length > bufferSize) pitchBufferRef.current.shift();

      // Median filter for stability
      const sorted = [...pitchBufferRef.current].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];

      const noteNum  = noteFromPitch(median);
      const noteName = noteStrings[noteNum % 12];
      const octave   = Math.floor(noteNum / 12) - 1;
      const c        = centsOff(median, noteNum);

      setNote(noteName + octave);
      setFrequency(median);
      setCents(c);
      setStatus(Math.abs(c) <= 5 ? 'tuned' : c < 0 ? 'flat' : 'sharp');
      setDetectedString(closestString(median));
    } else {
      // Don't clear immediately — keep last reading for a moment
      if (pitchBufferRef.current.length > 0) {
        pitchBufferRef.current.pop();
      }
    }

    if (isListeningRef.current) rafIdRef.current = requestAnimationFrame(updatePitch);
  }, []);

  const stopTuner = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    setNote('—');
    setFrequency(0);
    setCents(0);
    setStatus('idle');
    setDetectedString(null);
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      const src = microphoneRef.current as MediaStreamAudioSourceNode & { mediaStream: MediaStream };
      src.mediaStream?.getTracks().forEach((t) => t.stop());
    }
  }, []);

  const toggleTuner = async () => {
    if (!isListening) {
      try {
        if (!audioContextRef.current) {
          const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioContextRef.current = new AC();
        }
        if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });

        microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current   = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 4096;
        analyserRef.current.smoothingTimeConstant = 0.4;
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

  useEffect(() => () => { stopTuner(); }, [stopTuner]);

  const noteColor =
    status === 'tuned' ? 'var(--phosphor)' :
    status === 'flat'  ? 'var(--blue-tuning)' :
    status === 'sharp' ? 'var(--red-tuning)' :
    'var(--cream-muted)';

  const noteGlow =
    status === 'tuned' ? '0 0 24px rgba(80,232,128,0.7), 0 0 60px rgba(80,232,128,0.3)' :
    isListening        ? '0 0 20px rgba(0,196,180,0.25)' :
    'none';

  return (
    <div style={{ maxWidth: '580px', margin: '0 auto' }}>
      <div style={{
        border: '1px solid var(--gold-border)',
        background: 'var(--bg-surface)',
        padding: 'clamp(28px, 5vw, 48px) clamp(24px, 4vw, 40px)',
        position: 'relative',
        boxShadow: '0 12px 56px rgba(0,0,0,0.75), inset 0 1px 0 rgba(0,196,180,0.07)',
      }}>
        {corners.map((s, i) => (
          <div key={i} style={{ position: 'absolute', width: 22, height: 22, ...s }} />
        ))}

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

        {/* Guitar string selector */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '6px',
          marginBottom: '24px',
        }}>
          {GUITAR_STRINGS.map((s, i) => {
            const isTarget = targetString === i;
            const isDetected = detectedString === i && isListening;
            const stringStatus = isDetected
              ? (status === 'tuned' ? 'tuned' : status === 'flat' ? 'flat' : 'sharp')
              : null;
            return (
              <button
                key={s.name}
                onClick={() => setTargetString(isTarget ? null : i)}
                style={{
                  width: '48px',
                  height: '52px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  border: isTarget
                    ? '1px solid var(--gold-bright)'
                    : isDetected
                      ? `1px solid ${stringStatus === 'tuned' ? 'rgba(80,232,128,0.6)' : stringStatus === 'flat' ? 'rgba(68,136,204,0.5)' : 'rgba(224,72,72,0.5)'}`
                      : '1px solid var(--gold-border)',
                  background: isTarget
                    ? 'rgba(0,130,120,0.2)'
                    : isDetected && stringStatus === 'tuned'
                      ? 'rgba(80,232,128,0.08)'
                      : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: isDetected && stringStatus === 'tuned'
                    ? '0 0 12px rgba(80,232,128,0.3)'
                    : 'none',
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-ibm-mono, monospace)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: isDetected && stringStatus === 'tuned'
                    ? 'var(--phosphor)'
                    : isTarget
                      ? 'var(--gold-bright)'
                      : isDetected
                        ? (stringStatus === 'flat' ? 'var(--blue-tuning)' : 'var(--red-tuning)')
                        : 'var(--cream-muted)',
                  transition: 'color 0.15s',
                }}>
                  {s.note}
                </span>
                <span style={{
                  fontFamily: 'var(--font-ibm-mono, monospace)',
                  fontSize: '0.55rem',
                  color: 'var(--cream-muted)',
                  opacity: 0.5,
                }}>
                  {s.freq.toFixed(0)}
                </span>
              </button>
            );
          })}
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
          }}>
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
              {status === 'tuned' && '\u2713 In Tune'}
              {status === 'flat'  && `Tune Up  \u2191  ${cents}\u00a2`}
              {status === 'sharp' && `Tune Down  \u2193  +${cents}\u00a2`}
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
                : 'linear-gradient(135deg, rgba(0,130,120,0.6), rgba(0,90,83,0.4))',
              color: isListening ? 'var(--red-tuning)' : 'var(--gold-bright)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {isListening ? '\u25FC  Stop' : '\u25CF  Start Tuner'}
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
          A &middot; 440 Hz &middot; Standard Tuning
        </div>
      </div>
    </div>
  );
}
