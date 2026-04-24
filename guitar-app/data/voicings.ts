import { Chord, Voicing } from '@/types';

// ── Root Note Parsing ───────────────────────────────────────────────────────
const NOTE_IDX: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
  'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
};

function parseRoot(name: string): number | null {
  // Match 1 or 2 chars root (with optional # or b), stop before type suffix
  const m = name.match(/^([A-G][#b]?)/);
  if (!m) return null;
  return NOTE_IDX[m[1]] ?? null;
}

// ── Barre Shape Templates ───────────────────────────────────────────────────
// Offsets relative to barre fret. Low E → high e.
type Shape = {
  strings: (number | 'x')[];
  fingers: number[];
};

const E_SHAPES: Partial<Record<Chord['type'], Shape>> = {
  major:  { strings: [0, 2, 2, 1, 0, 0], fingers: [1, 3, 4, 2, 1, 1] },
  minor:  { strings: [0, 2, 2, 0, 0, 0], fingers: [1, 3, 4, 1, 1, 1] },
  '7th':  { strings: [0, 2, 0, 1, 0, 0], fingers: [1, 3, 1, 2, 1, 1] },
  maj7:   { strings: [0, 2, 1, 1, 0, 0], fingers: [1, 4, 2, 3, 1, 1] },
  m7:     { strings: [0, 2, 0, 0, 0, 0], fingers: [1, 3, 1, 1, 1, 1] },
  sus2:   { strings: [0, 2, 2,-1, 0, 0], fingers: [1, 3, 4, 0, 1, 1] }, // -1 unavailable — fallback mute via `x`
  sus4:   { strings: [0, 2, 2, 2, 0, 0], fingers: [1, 3, 4, 2, 1, 1] },
};

const A_SHAPES: Partial<Record<Chord['type'], Shape>> = {
  major:  { strings: ['x', 0, 2, 2, 2, 0], fingers: [0, 1, 3, 4, 2, 1] },
  minor:  { strings: ['x', 0, 2, 2, 1, 0], fingers: [0, 1, 3, 4, 2, 1] },
  '7th':  { strings: ['x', 0, 2, 0, 2, 0], fingers: [0, 1, 3, 1, 4, 1] },
  maj7:   { strings: ['x', 0, 2, 1, 2, 0], fingers: [0, 1, 3, 2, 4, 1] },
  m7:     { strings: ['x', 0, 2, 0, 1, 0], fingers: [0, 1, 3, 1, 2, 1] },
  sus2:   { strings: ['x', 0, 2, 2, 0, 0], fingers: [0, 1, 3, 4, 0, 0] },
  sus4:   { strings: ['x', 0, 2, 2, 3, 0], fingers: [0, 1, 2, 3, 4, 0] },
};

// ── D-string triad (higher voicing, no low notes) ───────────────────────────
// Roots on D string. Barre fret F = offset 0 of D string.
// Useful for compact voicings higher up the neck.
const D_SHAPES: Partial<Record<Chord['type'], Shape>> = {
  major:  { strings: ['x', 'x', 0, 2, 3, 2], fingers: [0, 0, 1, 2, 4, 3] },
  minor:  { strings: ['x', 'x', 0, 2, 3, 1], fingers: [0, 0, 1, 2, 4, 1] },
  '7th':  { strings: ['x', 'x', 0, 2, 1, 2], fingers: [0, 0, 1, 3, 2, 4] },
  maj7:   { strings: ['x', 'x', 0, 2, 2, 2], fingers: [0, 0, 1, 2, 3, 4] },
  m7:     { strings: ['x', 'x', 0, 2, 1, 1], fingers: [0, 0, 1, 3, 2, 2] },
};

// ── Apply a shape at a given barre fret ─────────────────────────────────────
function applyShape(shape: Shape, fret: number): { strings: (number | 'x' | 'o')[]; fingers: number[]; baseFret: number } | null {
  if (fret < 1 || fret > 13) return null;
  const newStrings: (number | 'x' | 'o')[] = shape.strings.map((v) => {
    if (v === 'x') return 'x';
    if ((v as number) < 0) return 'x';
    const f = fret + (v as number);
    if (f > 17) return 'x';
    return f === 0 ? 'o' : f;
  });
  // baseFret = lowest non-zero, non-x fret
  const fretted = newStrings.filter((v): v is number => typeof v === 'number' && v > 0);
  const baseFret = fretted.length > 0 ? Math.min(...fretted) : 1;
  return { strings: newStrings, fingers: shape.fingers, baseFret };
}

// ── Dedupe helper ───────────────────────────────────────────────────────────
function voicingKey(v: { strings: (number | 'x' | 'o')[] }): string {
  return v.strings.join('|');
}

// ── Main: build voicings list for a chord ───────────────────────────────────
export function buildVoicings(chord: Chord): Voicing[] {
  const root = parseRoot(chord.name);
  if (root === null) return [{ label: 'Open', strings: chord.strings, fingers: chord.fingers, baseFret: chord.baseFret }];

  const out: Voicing[] = [];
  const seen = new Set<string>();

  // 1. Default (from chord data)
  const def: Voicing = { label: 'Open', strings: chord.strings, fingers: chord.fingers, baseFret: chord.baseFret };
  out.push(def);
  seen.add(voicingKey(def));

  const hasOpen = chord.strings.some((s) => s === 'o');
  if (!hasOpen) out[0].label = 'Position 1';

  // 2. E-shape barre — root on low E
  const eFret = ((root - 4) + 12) % 12;
  const eShape = E_SHAPES[chord.type];
  if (eShape && eFret > 0) {
    const v = applyShape(eShape, eFret);
    if (v) {
      const voicing: Voicing = { label: `E-shape · Fret ${eFret}`, ...v };
      if (!seen.has(voicingKey(voicing))) { out.push(voicing); seen.add(voicingKey(voicing)); }
    }
  }
  // Try 12 frets up for open-chord keys (e.g., E root → fret 12)
  if (eShape && (eFret === 0 || eFret + 12 <= 15)) {
    const altFret = eFret + 12;
    if (altFret <= 15) {
      const v = applyShape(eShape, altFret);
      if (v) {
        const voicing: Voicing = { label: `E-shape · Fret ${altFret}`, ...v };
        if (!seen.has(voicingKey(voicing))) { out.push(voicing); seen.add(voicingKey(voicing)); }
      }
    }
  }

  // 3. A-shape barre — root on A string
  const aFret = ((root - 9) + 12) % 12;
  const aShape = A_SHAPES[chord.type];
  if (aShape && aFret > 0) {
    const v = applyShape(aShape, aFret);
    if (v) {
      const voicing: Voicing = { label: `A-shape · Fret ${aFret}`, ...v };
      if (!seen.has(voicingKey(voicing))) { out.push(voicing); seen.add(voicingKey(voicing)); }
    }
  }
  if (aShape && aFret === 0) {
    const altFret = 12;
    const v = applyShape(aShape, altFret);
    if (v) {
      const voicing: Voicing = { label: `A-shape · Fret ${altFret}`, ...v };
      if (!seen.has(voicingKey(voicing))) { out.push(voicing); seen.add(voicingKey(voicing)); }
    }
  }

  // 4. D-string triad — root on D string (higher voicing)
  const dFret = ((root - 2) + 12) % 12;
  const dShape = D_SHAPES[chord.type];
  if (dShape && dFret >= 0) {
    const baseF = dFret === 0 ? 0 : dFret;
    const v = applyShape(dShape, baseF);
    if (v) {
      const voicing: Voicing = { label: `Triad · Fret ${baseF}`, ...v };
      if (!seen.has(voicingKey(voicing))) { out.push(voicing); seen.add(voicingKey(voicing)); }
    }
  }

  return out;
}
