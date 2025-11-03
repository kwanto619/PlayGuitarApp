export interface Chord {
  name: string;
  type: 'major' | 'minor' | '7th' | 'sus';
  strings: (number | 'x' | 'o')[];
  fingers: number[];
  baseFret: number;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  chords: string[];
  lyrics?: string;
  notes?: string;
  language: 'greek' | 'english';
}
