'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const noteStrings = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// ── Alternate Tunings (low to high, 6 strings) ─────────────────────────────
interface TuningString { name: string; note: string; octave: number; freq: number; }
interface TuningPreset { id: string; label: string; strings: TuningString[]; }

// Note name → frequency (uses A4 = 440 Hz)
function freqOf(noteName: string, octave: number): number {
  const idx = noteStrings.indexOf(noteName);
  const midi = 12 * (octave + 1) + idx;
  return 440 * Math.pow(2, (midi - 69) / 12);
}
function mk(note: string, octave: number): TuningString {
  return { name: `${note}${octave}`, note, octave, freq: freqOf(note, octave) };
}

const TUNINGS: TuningPreset[] = [
  { id: 'standard',    label: 'Standard · EADGBE',     strings: [mk('E',2), mk('A',2), mk('D',3), mk('G',3), mk('B',3), mk('E',4)] },
  { id: 'drop-d',      label: 'Drop D · DADGBE',       strings: [mk('D',2), mk('A',2), mk('D',3), mk('G',3), mk('B',3), mk('E',4)] },
  { id: 'drop-c',      label: 'Drop C · CGCFAD',       strings: [mk('C',2), mk('G',2), mk('C',3), mk('F',3), mk('A',3), mk('D',4)] },
  { id: 'half-step',   label: 'Half Step Down',        strings: [mk('D#',2), mk('G#',2), mk('C#',3), mk('F#',3), mk('A#',3), mk('D#',4)] },
  { id: 'full-step',   label: 'Full Step Down',        strings: [mk('D',2), mk('G',2), mk('C',3), mk('F',3), mk('A',3), mk('D',4)] },
  { id: 'dadgad',      label: 'DADGAD',                strings: [mk('D',2), mk('A',2), mk('D',3), mk('G',3), mk('A',3), mk('D',4)] },
  { id: 'open-d',      label: 'Open D · DADF#AD',      strings: [mk('D',2), mk('A',2), mk('D',3), mk('F#',3), mk('A',3), mk('D',4)] },
  { id: 'open-g',      label: 'Open G · DGDGBD',       strings: [mk('D',2), mk('G',2), mk('D',3), mk('G',3), mk('B',3), mk('D',4)] },
  { id: 'open-e',      label: 'Open E · EBEG#BE',      strings: [mk('E',2), mk('B',2), mk('E',3), mk('G#',3), mk('B',3), mk('E',4)] },
  { id: 'open-c',      label: 'Open C · CGCGCE',       strings: [mk('C',2), mk('G',2), mk('C',3), mk('G',3), mk('C',4), mk('E',4)] },
];

// ── YIN Pitch Detection Algorithm ──────────────────────────────────────────
function yinDetect(buffer: Float32Array, sampleRate: number): { freq: number; probability: number } {
  const THRESHOLD = 0.15;
  const halfSize = Math.floor(buffer.length / 2);

  let rms = 0;
  for (let i = 0; i < buffer.length; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / buffer.length);
  if (rms < 0.008) return { freq: -1, probability: 0 };

  const diff = new Float32Array(halfSize);
  for (let tau = 0; tau < halfSize; tau++) {
    let sum = 0;
    for (let i = 0; i < halfSize; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    diff[tau] = sum;
  }

  const cmnd = new Float32Array(halfSize);
  cmnd[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfSize; tau++) {
    runningSum += diff[tau];
    cmnd[tau] = diff[tau] * tau / runningSum;
  }

  let tau = 2;
  while (tau < halfSize) {
    if (cmnd[tau] < THRESHOLD) {
      while (tau + 1 < halfSize && cmnd[tau + 1] < cmnd[tau]) tau++;
      break;
    }
    tau++;
  }

  if (tau >= halfSize) return { freq: -1, probability: 0 };

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

  if (freq < 60 || freq > 1200) return { freq: -1, probability: 0 };

  return { freq, probability };
}

// ── Compact Analog Meter ───────────────────────────────────────────────────
function MeterSVG({ cents, status }: { cents: number; status: string }) {
  const CX = 160, CY = 120, R = 90;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const pt = (deg: number, r: number) => ({
    x: CX + r * Math.cos(toRad(deg)),
    y: CY + r * Math.sin(toRad(deg)),
  });

  const arcStart = pt(210, R);
  const arcEnd   = pt(330, R);
  const greenS   = pt(258, R);
  const greenE   = pt(282, R);

  const clampedCents   = Math.max(-50, Math.min(50, cents));
  const needleRotation = (clampedCents / 50) * 60;

  const isInTune = status === 'tuned';
  const needleColor =
    status === 'tuned' ? '#50e880' :
    status === 'flat'  ? '#4488cc' :
    status === 'sharp' ? '#e04848' :
    '#5a4418';

  const majorTicks = [-50, -25, 0, 25, 50];

  const arc = (s: { x: number; y: number }, e: { x: number; y: number }) =>
    `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;

  return (
    <svg viewBox="0 0 320 130" style={{ width: '100%', maxWidth: '340px', display: 'block', margin: '0 auto' }}>
      <path d={arc(arcStart, arcEnd)} fill="none" stroke="rgba(0,196,180,0.1)" strokeWidth="14" strokeLinecap="round" />
      <path d={arc(arcStart, greenS)} fill="none" stroke="rgba(68,136,204,0.18)" strokeWidth="14" />
      <path d={arc(greenE, arcEnd)}   fill="none" stroke="rgba(224,72,72,0.18)" strokeWidth="14" />
      <path d={arc(greenS, greenE)}   fill="none"
        stroke={isInTune ? 'rgba(80,232,128,0.85)' : 'rgba(80,232,128,0.22)'}
        strokeWidth="14" style={{ transition: 'stroke 0.2s' }} />

      {majorTicks.map((c) => {
        const deg   = 270 + (c / 50) * 60;
        const inner = pt(deg, R - 16);
        const outer = pt(deg, R + 6);
        return (
          <line key={c}
            x1={inner.x.toFixed(2)} y1={inner.y.toFixed(2)}
            x2={outer.x.toFixed(2)} y2={outer.y.toFixed(2)}
            stroke={c === 0 ? 'rgba(80,232,128,0.5)' : 'rgba(0,196,180,0.28)'}
            strokeWidth={c === 0 ? 2 : 1.2} />
        );
      })}

      <g style={{
        transform: `translate(${CX}px, ${CY}px) rotate(${needleRotation}deg)`,
        transition: 'transform 0.12s ease-out',
      }}>
        <line x1="0" y1="4" x2="0" y2={-(R - 8)} stroke={needleColor} strokeWidth="1.5" strokeLinecap="round" />
        <polygon points={`0,${-(R - 8)} -3,${-(R - 18)} 3,${-(R - 18)}`} fill={needleColor} />
      </g>

      <circle cx={CX} cy={CY} r="5"   fill="var(--bg-surface)" />
      <circle cx={CX} cy={CY} r="3.2" fill={needleColor} />
    </svg>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function Tuner() {
  const [tuningId, setTuningId] = useState('standard');
  const [isListening, setIsListening] = useState(false);
  const [note,        setNote]        = useState('—');
  const [frequency,   setFrequency]   = useState(0);
  const [cents,       setCents]       = useState(0);
  const [status,      setStatus]      = useState<'tuned' | 'sharp' | 'flat' | 'idle'>('idle');
  const [targetString, setTargetString] = useState<number | null>(null);
  const [detectedString, setDetectedString] = useState<number | null>(null);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);

  const tuning = useMemo(() => TUNINGS.find((t) => t.id === tuningId) ?? TUNINGS[0], [tuningId]);
  const STRINGS = tuning.strings;

  const audioContextRef  = useRef<AudioContext | null>(null);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const microphoneRef    = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafIdRef         = useRef<number | null>(null);
  const pitchBufferRef   = useRef<number[]>([]);
  const isListeningRef   = useRef(false);
  const toneTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bufferSize = 5;

  const noteFromPitch = (f: number) => Math.round(12 * (Math.log(f / 440) / Math.log(2))) + 69;
  const freqFromNote  = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
  const centsOff = (f: number, n: number) => Math.floor(1200 * Math.log(f / freqFromNote(n)) / Math.log(2));

  const closestString = useCallback((freq: number): number => {
    let minDist = Infinity, idx = 0;
    for (let i = 0; i < STRINGS.length; i++) {
      const c = Math.abs(1200 * Math.log(freq / STRINGS[i].freq) / Math.log(2));
      if (c < minDist) { minDist = c; idx = i; }
    }
    return idx;
  }, [STRINGS]);

  const ensureCtx = useCallback(async () => {
    if (!audioContextRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AC();
    }
    if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
    return audioContextRef.current;
  }, []);

  // Click-to-play reference tone
  const playReference = useCallback(async (idx: number) => {
    const ctx = await ensureCtx();
    const freq = STRINGS[idx].freq;
    const now  = ctx.currentTime;
    const dur  = 1.8;

    // Plucked-string-ish tone: triangle + fundamental + small 2nd harmonic
    const mk = (type: OscillatorType, f: number, g: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type; osc.frequency.value = f;
      osc.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(g, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.start(now); osc.stop(now + dur);
    };
    mk('triangle', freq, 0.25);
    mk('sine', freq * 2, 0.06);

    setPlayingIdx(idx);
    if (toneTimerRef.current) clearTimeout(toneTimerRef.current);
    toneTimerRef.current = setTimeout(() => setPlayingIdx(null), dur * 1000);
  }, [STRINGS, ensureCtx]);

  const updatePitch = useCallback(() => {
    if (!analyserRef.current || !isListeningRef.current) return;

    const buffer = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buffer);
    const result = yinDetect(buffer, audioContextRef.current!.sampleRate);

    if (result.freq > 0 && result.probability > 0.8) {
      pitchBufferRef.current.push(result.freq);
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
      setStatus(Math.abs(c) <= 5 ? 'tuned' : c < 0 ? 'flat' : 'sharp');
      setDetectedString(closestString(median));
    } else {
      if (pitchBufferRef.current.length > 0) pitchBufferRef.current.pop();
    }

    if (isListeningRef.current) rafIdRef.current = requestAnimationFrame(updatePitch);
  }, [closestString]);

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
        const ctx = await ensureCtx();
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
        microphoneRef.current = ctx.createMediaStreamSource(stream);
        analyserRef.current   = ctx.createAnalyser();
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
    status === 'tuned' ? '0 0 20px rgba(80,232,128,0.6), 0 0 40px rgba(80,232,128,0.25)' :
    isListening        ? '0 0 16px rgba(0,196,180,0.22)' :
    'none';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', width: '100%',
      gap: '10px',
      alignItems: 'center',
    }}>
      {/* Tuning preset selector */}
      <div style={{ width: '100%', maxWidth: '560px' }}>
        <div style={{
          fontSize: '0.55rem', letterSpacing: '0.4em', color: 'var(--gold-dim)',
          textTransform: 'uppercase', marginBottom: '4px', textAlign: 'center',
        }}>
          Tuning
        </div>
        <select
          value={tuningId}
          onChange={(e) => { setTuningId(e.target.value); setTargetString(null); }}
          style={{
            width: '100%', padding: '8px 12px',
            fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.9rem',
            letterSpacing: '0.12em',
            background: 'var(--bg-input)', color: 'var(--gold-bright)',
            border: '1px solid var(--gold-border-mid)', cursor: 'pointer', outline: 'none',
          }}
        >
          {TUNINGS.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Guitar string buttons (click = play reference tone) */}
      <div className="tuner-strings-row" style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'nowrap' }}>
        {STRINGS.map((s, i) => {
          const isTarget   = targetString === i;
          const isDetected = detectedString === i && isListening;
          const isPlaying  = playingIdx === i;
          const stringStatus = isDetected
            ? (status === 'tuned' ? 'tuned' : status === 'flat' ? 'flat' : 'sharp')
            : null;
          return (
            <button
              key={`${s.name}-${i}`}
              className="tuner-string-btn"
              onClick={() => { setTargetString(isTarget ? null : i); playReference(i); }}
              title={`Play ${s.name} (${s.freq.toFixed(1)} Hz)`}
              style={{
                width: '52px', height: '56px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '2px', cursor: 'pointer',
                border: isTarget
                  ? '1px solid var(--gold-bright)'
                  : isDetected
                    ? `1px solid ${stringStatus === 'tuned' ? 'rgba(80,232,128,0.6)' : stringStatus === 'flat' ? 'rgba(68,136,204,0.5)' : 'rgba(224,72,72,0.5)'}`
                    : '1px solid var(--gold-border)',
                background: isPlaying
                  ? 'rgba(0,232,213,0.25)'
                  : isTarget
                    ? 'rgba(0,130,120,0.2)'
                    : isDetected && stringStatus === 'tuned'
                      ? 'rgba(80,232,128,0.08)'
                      : 'transparent',
                transition: 'all 0.12s',
                boxShadow: isPlaying ? '0 0 14px rgba(0,232,213,0.5)' : isDetected && stringStatus === 'tuned' ? '0 0 12px rgba(80,232,128,0.3)' : 'none',
              }}
            >
              <span style={{
                fontFamily: 'var(--font-ibm-mono, monospace)', fontSize: '1.05rem', fontWeight: 600,
                color: isPlaying ? 'var(--gold-bright)'
                     : isDetected && stringStatus === 'tuned' ? 'var(--phosphor)'
                     : isTarget ? 'var(--gold-bright)'
                     : isDetected ? (stringStatus === 'flat' ? 'var(--blue-tuning)' : 'var(--red-tuning)')
                     : 'var(--cream-muted)',
              }}>
                {s.note}
              </span>
              <span style={{
                fontFamily: 'var(--font-ibm-mono, monospace)', fontSize: '0.55rem',
                color: 'var(--cream-muted)', opacity: 0.6,
              }}>
                {s.freq.toFixed(0)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Note display (compact) */}
      <div style={{ textAlign: 'center', lineHeight: 1 }}>
        <div style={{
          fontFamily: 'var(--font-ibm-mono, monospace)',
          fontSize: 'clamp(2.8rem, 7vw, 4.2rem)',
          fontWeight: 600, lineHeight: 1,
          color: noteColor, textShadow: noteGlow,
          transition: 'color 0.2s, text-shadow 0.2s',
          letterSpacing: '-0.02em',
        }}>
          {note}
        </div>
        <div style={{
          fontFamily: 'var(--font-ibm-mono, monospace)', fontSize: '0.78rem',
          color: 'var(--cream-muted)', letterSpacing: '0.12em', marginTop: '2px',
          minHeight: '16px',
        }}>
          {isListening && frequency > 0 ? `${frequency.toFixed(1)} Hz` : ''}
        </div>
      </div>

      {/* Meter */}
      <MeterSVG cents={cents} status={status} />

      {/* Status */}
      <div style={{ minHeight: '26px', textAlign: 'center' }}>
        {isListening && (
          <div style={{
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: '1rem', fontWeight: 500,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: noteColor,
            textShadow: status === 'tuned' ? '0 0 16px rgba(80,232,128,0.5)' : 'none',
          }}>
            {status === 'tuned' && '✓ In Tune'}
            {status === 'flat'  && `Tune Up  ↑  ${cents}¢`}
            {status === 'sharp' && `Tune Down  ↓  +${cents}¢`}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 420px) {
          .tuner-strings-row { gap: 4px !important; }
          .tuner-string-btn  { width: 44px !important; height: 50px !important; }
        }
        @media (max-width: 360px) {
          .tuner-string-btn  { width: 40px !important; height: 46px !important; }
        }
      `}</style>

      {/* Start / Stop button */}
      <button
        onClick={toggleTuner}
        style={{
          padding: '11px 40px',
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.25em', textTransform: 'uppercase',
          cursor: 'pointer',
          border: isListening ? '1px solid rgba(224,72,72,0.55)' : '1px solid var(--gold-border-mid)',
          background: isListening
            ? 'linear-gradient(135deg, rgba(224,72,72,0.12), rgba(224,72,72,0.06))'
            : 'linear-gradient(135deg, rgba(0,130,120,0.6), rgba(0,90,83,0.4))',
          color: isListening ? 'var(--red-tuning)' : 'var(--gold-bright)',
          transition: 'all 0.2s',
        }}
      >
        {isListening ? '◼  Stop' : '●  Start Tuner'}
      </button>
    </div>
  );
}
