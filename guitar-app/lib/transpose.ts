const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#', Eb: 'D#', Fb: 'E', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B',
};

export function transposeChord(chord: string, semitones: number): string {
  if (semitones === 0) return chord;
  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return chord;
  let root = match[1];
  const suffix = match[2];
  if (FLAT_TO_SHARP[root]) root = FLAT_TO_SHARP[root];
  const idx = CHROMATIC.indexOf(root as typeof CHROMATIC[number]);
  if (idx === -1) return chord;
  return CHROMATIC[((idx + semitones) % 12 + 12) % 12] + suffix;
}

export function transposeChords(chords: string[], semitones: number): string[] {
  return chords.map((c) => transposeChord(c, semitones));
}

export function getTransposeLabel(semitones: number): string {
  if (semitones === 0) return '0';
  return semitones > 0 ? `+${semitones}` : `${semitones}`;
}

export const TEMPO_NAMES: { max: number; name: string }[] = [
  { max: 60,  name: 'Largo' },
  { max: 66,  name: 'Larghetto' },
  { max: 76,  name: 'Adagio' },
  { max: 108, name: 'Andante' },
  { max: 120, name: 'Moderato' },
  { max: 156, name: 'Allegretto' },
  { max: 176, name: 'Allegro' },
  { max: 200, name: 'Vivace' },
  { max: 999, name: 'Presto' },
];

export function getTempoName(bpm: number): string {
  return TEMPO_NAMES.find((t) => bpm <= t.max)?.name ?? 'Presto';
}
