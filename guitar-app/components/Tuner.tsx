'use client';

import { useState, useEffect, useRef } from 'react';

const noteStrings = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export default function Tuner() {
  const [isListening, setIsListening] = useState(false);
  const [note, setNote] = useState('-');
  const [frequency, setFrequency] = useState(0);
  const [cents, setCents] = useState(0);
  const [status, setStatus] = useState<'tuned' | 'sharp' | 'flat' | 'idle'>('idle');

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const pitchBufferRef = useRef<number[]>([]);

  const minVolume = 0.005;
  const minConfidence = 0.85;
  const bufferSize = 5;

  const autoCorrelate = (buffer: Float32Array, sampleRate: number): number => {
    const SIZE = buffer.length;
    let rms = 0;

    for (let i = 0; i < SIZE; i++) {
      const val = buffer[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);

    if (rms < minVolume) return -1;

    let r1 = 0;
    const threshold = 0.2;

    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buffer[i]) < threshold) {
        r1 = i;
        break;
      }
    }

    const correlations = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE - i; j++) {
        correlations[i] += buffer[j] * buffer[j + i];
      }
    }

    let d = 0;
    while (correlations[d] > correlations[d + 1]) d++;

    let maxval = -1;
    let maxpos = -1;
    for (let i = d; i < SIZE / 2; i++) {
      if (correlations[i] > maxval) {
        maxval = correlations[i];
        maxpos = i;
      }
    }

    let T0 = maxpos;

    if (T0 > 0 && T0 < SIZE - 1) {
      const x1 = correlations[T0 - 1];
      const x2 = correlations[T0];
      const x3 = correlations[T0 + 1];
      const a = (x1 + x3 - 2 * x2) / 2;
      const b = (x3 - x1) / 2;
      if (a) T0 = T0 - b / (2 * a);
    }

    const confidence = maxval / correlations[0];
    if (confidence < minConfidence) return -1;

    return sampleRate / T0;
  };

  const noteFromPitch = (frequency: number): number => {
    const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
    return Math.round(noteNum) + 69;
  };

  const frequencyFromNoteNumber = (note: number): number => {
    return 440 * Math.pow(2, (note - 69) / 12);
  };

  const centsOffFromPitch = (frequency: number, note: number): number => {
    return Math.floor(1200 * Math.log(frequency / frequencyFromNoteNumber(note)) / Math.log(2));
  };

  const updatePitch = () => {
    if (!analyserRef.current) return;

    const buffer = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buffer);
    const pitch = autoCorrelate(buffer, audioContextRef.current!.sampleRate);

    if (pitch > 60 && pitch < 1000) {
      pitchBufferRef.current.push(pitch);
      if (pitchBufferRef.current.length > bufferSize) {
        pitchBufferRef.current.shift();
      }

      const sortedPitches = [...pitchBufferRef.current].sort((a, b) => a - b);
      const medianPitch = sortedPitches[Math.floor(sortedPitches.length / 2)];

      const noteNum = noteFromPitch(medianPitch);
      const noteName = noteStrings[noteNum % 12];
      const octave = Math.floor(noteNum / 12) - 1;
      const centsOff = centsOffFromPitch(medianPitch, noteNum);

      setNote(noteName + octave);
      setFrequency(medianPitch);
      setCents(centsOff);

      if (Math.abs(centsOff) <= 2) {
        setStatus('tuned');
      } else if (centsOff < 0) {
        setStatus('flat');
      } else {
        setStatus('sharp');
      }
    } else {
      pitchBufferRef.current = [];
    }

    if (isListening) {
      rafIdRef.current = requestAnimationFrame(updatePitch);
    }
  };

  const toggleTuner = async () => {
    if (!isListening) {
      try {
        if (!audioContextRef.current) {
          const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioContextRef.current = new AudioContextClass();
        }

        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 44100,
          },
        });

        microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 8192;
        analyserRef.current.smoothingTimeConstant = 0.8;
        microphoneRef.current.connect(analyserRef.current);

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
    setIsListening(false);
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      const mediaStreamSource = microphoneRef.current as MediaStreamAudioSourceNode & { mediaStream: MediaStream };
      if (mediaStreamSource.mediaStream) {
        mediaStreamSource.mediaStream.getTracks().forEach((track) => track.stop());
      }
    }
  };

  useEffect(() => {
    return () => {
      stopTuner();
    };
  }, []);

  const needlePosition = 50 + Math.max(-50, Math.min(50, cents));

  return (
    <div className="bg-gray-800 border border-gray-700 backdrop-blur-lg rounded-3xl p-10 shadow-2xl">
      <h2 className="text-4xl font-bold text-custom-orange text-center mb-8">Chromatic Tuner</h2>

      <button
        onClick={toggleTuner}
        className={`block mx-auto mb-8 px-12 py-4 rounded-full text-xl font-semibold transition-all ${
          isListening
            ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-500/40'
            : 'bg-custom-orange hover:bg-custom-orange-hover shadow-custom-orange/40'
        } text-white shadow-xl hover:shadow-2xl hover:-translate-y-1`}
      >
        {isListening ? 'Stop Tuner' : 'Start Tuner'}
      </button>

      {isListening && (
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-8xl font-extrabold text-custom-orange mb-2">{note}</div>
            <div className="text-2xl text-gray-400 font-medium">{frequency.toFixed(1)} Hz</div>
          </div>

          <div className="my-10">
            <div className="relative h-20 bg-gradient-to-r from-blue-500 via-green-500 to-red-500 rounded-full shadow-inner mb-4">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gray-800 border-4 border-green-500 rounded-full flex items-center justify-center text-3xl font-bold text-green-500 shadow-lg z-10">
                ✓
              </div>
              <div
                className="absolute w-1.5 h-28 top-1/2 -translate-y-1/2 rounded shadow-lg transition-all duration-150 ease-out"
                style={{ left: `${needlePosition}%`, transform: 'translate(-50%, -50%)', backgroundColor: 'rgb(216, 86, 0)' }}
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[15px]" style={{ borderTopColor: 'rgb(216, 86, 0)' }} />
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[15px]" style={{ borderBottomColor: 'rgb(216, 86, 0)' }} />
              </div>
            </div>
            <div className="flex justify-between text-sm font-semibold text-gray-400 px-2">
              <span>-50</span>
              <span>-40</span>
              <span>-30</span>
              <span>-20</span>
              <span>-10</span>
              <span>0</span>
              <span>+10</span>
              <span>+20</span>
              <span>+30</span>
              <span>+40</span>
              <span>+50</span>
            </div>
          </div>

          <div className="text-center mt-8">
            <div
              className={`text-3xl font-bold mb-2 ${
                status === 'tuned'
                  ? 'text-green-500'
                  : status === 'flat'
                  ? 'text-blue-500'
                  : status === 'sharp'
                  ? 'text-red-500'
                  : 'text-gray-500'
              }`}
            >
              {status === 'tuned' && '✓ IN TUNE'}
              {status === 'flat' && `${cents} - TUNE UP ↑`}
              {status === 'sharp' && `+${cents} - TUNE DOWN ↓`}
              {status === 'idle' && '-'}
            </div>
            <div className="text-xl text-gray-400 font-medium">
              {cents > 0 ? '+' : ''}{cents} cents
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
