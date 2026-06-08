import { chords as chordLibrary } from '@/data/chords';
import type { Chord } from '@/types';

// The chord library is sharp-only and stores exact names (e.g. "Cmaj7").
// Songs use flats ("Bb"), slash chords ("D/F#"), and notation variants
// ("EM", "CM7"). This resolver maps any of those onto a library shape so the
// diagram/tooltip can render. Used by both chord chips and inline lyrics.

const byName = new Map(chordLibrary.map((c) => [c.name, c]));

// Enharmonic flats → the sharp names the library uses.
const NOTE_ALIAS: Record<string, string> = {
  Ab: 'G#', Bb: 'A#', Cb: 'B', Db: 'C#', Eb: 'D#', Fb: 'E', Gb: 'F#',
  'E#': 'F', 'B#': 'C',
};

function normalizeRoot(root: string): string {
  return NOTE_ALIAS[root] ?? root;
}

// Normalise a single chord token (no slash) to a library name, or null.
function normalizeName(core: string): string | null {
  const m = core.match(/^([A-Ga-g][#b]?)(.*)$/);
  if (!m) return null;
  const root = normalizeRoot(m[1][0].toUpperCase() + m[1].slice(1));
  let q = m[2].trim();

  // Quality notation fixes.
  if (q === 'M') q = 'm';                       // "EM" typo → minor
  else if (/^M(aj)?7$/.test(q)) q = 'maj7';     // "CM7" / "CMaj7" → maj7
  else if (/^maj9$/i.test(q)) q = 'maj9';
  else if (/^maj$/i.test(q)) q = '';            // "Cmaj" → C
  else if (/^min$/i.test(q)) q = 'm';
  else if (q === '°' || q === 'o') q = 'dim';
  else if (q === '+') q = 'aug';
  else if (q === 'sus') q = 'sus4';

  return root + q;
}

export interface ResolvedChord {
  chord: Chord;     // shape to draw
  display: string;  // original text to show as the title
  bass?: string;    // slash bass note, if any
}

/** Resolve any chord token to a drawable shape, or null if unknown. */
export function resolveChord(raw: string): ResolvedChord | null {
  const text = raw.trim();
  if (!text) return null;

  // Slash chord → resolve the part before the slash, keep the bass.
  let core = text;
  let bass: string | undefined;
  const slash = text.split('/');
  if (slash.length === 2 && slash[0] && slash[1]) {
    core = slash[0].trim();
    bass = slash[1].trim();
  }

  // Direct hit, then normalised hit.
  let chord = byName.get(core);
  if (!chord) {
    const norm = normalizeName(core);
    if (norm) chord = byName.get(norm);
  }
  if (!chord) return null;

  return { chord, display: text, bass };
}

/** True if a token resolves to a known chord shape. */
export function isKnownChord(raw: string): boolean {
  return resolveChord(raw) !== null;
}

// ── Regex for detecting chords inside lyric text ────────────────────────────
// Roots list longer-first (A# before A) so the alternation is greedy-correct.
const ROOTS = [
  'A#', 'Ab', 'A', 'B#', 'Bb', 'B', 'C#', 'Cb', 'C',
  'D#', 'Db', 'D', 'E#', 'Eb', 'E', 'F#', 'Fb', 'F', 'G#', 'Gb', 'G',
];
// Qualities longer/more-specific first.
const QUALITIES = [
  'maj9', 'maj7', 'dim7', '7sus4', 'sus2', 'sus4', 'add9',
  'm7', 'M7', 'maj', 'min', 'dim', 'aug', 'm', 'M', '7', '6', '9', '5', '',
];

const ROOT_ALT = ROOTS.join('|');
const QUAL_ALT = QUALITIES.join('|');

// A candidate chord token: root + optional quality + optional /bass.
export const CHORD_TOKEN = new RegExp(
  `(?<![A-Za-z])((?:${ROOT_ALT})(?:${QUAL_ALT})(?:\\/(?:${ROOT_ALT}))?)(?![A-Za-z0-9])`,
  'g',
);
