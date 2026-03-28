export interface Chord {
  name: string;
  type: 'major' | 'minor' | '7th' | 'maj7' | 'm7' | 'dim' | 'aug' | 'sus2' | 'sus4' | 'add9';
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
  bpm?: number;
  rating?: number; // 1–5
}

export interface Playlist {
  id: string;
  name: string;
  song_ids: string[];
}

export interface Progression {
  id: string;
  name: string;
  chords: string[];
  bpm: number;
}
