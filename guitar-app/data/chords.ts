import { Chord } from '@/types';

// strings: absolute fret numbers. 'x' = muted, 'o' = open.
// baseFret: lowest fret used (diagram starts here). Finger dots placed at
//   y = (fret - baseFret + 0.5) * fretSpacing from top of grid.

export const chords: Chord[] = [

  // ── MAJOR ─────────────────────────────────────────────────────────────────
  { name: 'C',  type: 'major', strings: ['x',3,2,'o',1,'o'],  fingers: [0,3,2,0,1,0], baseFret: 1 },
  { name: 'C#', type: 'major', strings: ['x',4,6,6,6,4],      fingers: [0,1,3,4,2,1], baseFret: 4 },
  { name: 'D',  type: 'major', strings: ['x','x','o',2,3,2],  fingers: [0,0,0,1,3,2], baseFret: 1 },
  { name: 'D#', type: 'major', strings: ['x','x',1,3,4,3],    fingers: [0,0,1,2,4,3], baseFret: 1 },
  { name: 'E',  type: 'major', strings: ['o',2,2,1,'o','o'],   fingers: [0,2,3,1,0,0], baseFret: 1 },
  { name: 'F',  type: 'major', strings: [1,3,3,2,1,1],         fingers: [1,3,4,2,1,1], baseFret: 1 },
  { name: 'F#', type: 'major', strings: [2,4,4,3,2,2],         fingers: [1,3,4,2,1,1], baseFret: 2 },
  { name: 'G',  type: 'major', strings: [3,2,'o','o','o',3],   fingers: [2,1,0,0,0,3], baseFret: 1 },
  { name: 'G#', type: 'major', strings: [4,6,6,5,4,4],         fingers: [1,3,4,2,1,1], baseFret: 4 },
  { name: 'A',  type: 'major', strings: ['x','o',2,2,2,'o'],   fingers: [0,0,1,2,3,0], baseFret: 1 },
  { name: 'A#', type: 'major', strings: ['x',1,3,3,3,1],       fingers: [0,1,3,4,2,1], baseFret: 1 },
  { name: 'B',  type: 'major', strings: ['x',2,4,4,4,2],       fingers: [0,1,3,4,2,1], baseFret: 2 },

  // ── MINOR ─────────────────────────────────────────────────────────────────
  { name: 'Cm',  type: 'minor', strings: ['x',3,5,5,4,3],      fingers: [0,1,3,4,2,1], baseFret: 3 },
  { name: 'C#m', type: 'minor', strings: ['x',4,6,6,5,4],      fingers: [0,1,3,4,2,1], baseFret: 4 },
  { name: 'Dm',  type: 'minor', strings: ['x','x','o',2,3,1],  fingers: [0,0,0,2,3,1], baseFret: 1 },
  { name: 'D#m', type: 'minor', strings: ['x','x',1,3,4,2],    fingers: [0,0,1,3,4,2], baseFret: 1 },
  { name: 'Em',  type: 'minor', strings: ['o',2,2,'o','o','o'], fingers: [0,1,2,0,0,0], baseFret: 1 },
  { name: 'Fm',  type: 'minor', strings: [1,3,3,1,1,1],         fingers: [1,3,4,1,1,1], baseFret: 1 },
  { name: 'F#m', type: 'minor', strings: [2,4,4,2,2,2],         fingers: [1,3,4,1,1,1], baseFret: 2 },
  { name: 'Gm',  type: 'minor', strings: [3,5,5,3,3,3],         fingers: [1,3,4,1,1,1], baseFret: 3 },
  { name: 'G#m', type: 'minor', strings: [4,6,6,4,4,4],         fingers: [1,3,4,1,1,1], baseFret: 4 },
  { name: 'Am',  type: 'minor', strings: ['x','o',2,2,1,'o'],   fingers: [0,0,2,3,1,0], baseFret: 1 },
  { name: 'A#m', type: 'minor', strings: ['x',1,3,3,2,1],       fingers: [0,1,3,4,2,1], baseFret: 1 },
  { name: 'Bm',  type: 'minor', strings: ['x',2,4,4,3,2],       fingers: [0,1,3,4,2,1], baseFret: 2 },

  // ── DOMINANT 7TH ──────────────────────────────────────────────────────────
  { name: 'C7',  type: '7th', strings: ['x',3,2,3,1,'o'],       fingers: [0,3,2,4,1,0], baseFret: 1 },
  { name: 'C#7', type: '7th', strings: ['x',4,6,4,6,4],         fingers: [0,1,3,1,4,1], baseFret: 4 },
  { name: 'D7',  type: '7th', strings: ['x','x','o',2,1,2],     fingers: [0,0,0,2,1,3], baseFret: 1 },
  { name: 'D#7', type: '7th', strings: ['x','x',1,3,2,3],       fingers: [0,0,1,3,2,4], baseFret: 1 },
  { name: 'E7',  type: '7th', strings: ['o',2,'o',1,'o','o'],   fingers: [0,2,0,1,0,0], baseFret: 1 },
  { name: 'F7',  type: '7th', strings: [1,3,1,2,1,1],           fingers: [1,3,1,2,1,1], baseFret: 1 },
  { name: 'F#7', type: '7th', strings: [2,4,2,3,2,2],           fingers: [1,3,1,2,1,1], baseFret: 2 },
  { name: 'G7',  type: '7th', strings: [3,2,'o','o','o',1],     fingers: [3,2,0,0,0,1], baseFret: 1 },
  { name: 'G#7', type: '7th', strings: [4,6,4,5,4,4],           fingers: [1,3,1,2,1,1], baseFret: 4 },
  { name: 'A7',  type: '7th', strings: ['x','o',2,'o',2,'o'],   fingers: [0,0,2,0,3,0], baseFret: 1 },
  { name: 'A#7', type: '7th', strings: ['x',1,3,1,3,1],         fingers: [0,1,3,1,4,1], baseFret: 1 },
  { name: 'B7',  type: '7th', strings: ['x',2,1,2,'o',2],       fingers: [0,2,1,3,0,4], baseFret: 1 },

  // ── MAJOR 7TH ─────────────────────────────────────────────────────────────
  { name: 'Cmaj7',  type: 'maj7', strings: ['x',3,2,'o','o','o'],  fingers: [0,3,2,0,0,0], baseFret: 1 },
  { name: 'C#maj7', type: 'maj7', strings: ['x',4,6,5,6,4],        fingers: [0,1,3,2,4,1], baseFret: 4 },
  { name: 'Dmaj7',  type: 'maj7', strings: ['x','x','o',2,2,2],    fingers: [0,0,0,1,2,3], baseFret: 1 },
  { name: 'D#maj7', type: 'maj7', strings: ['x','x',1,3,3,3],      fingers: [0,0,1,2,3,4], baseFret: 1 },
  { name: 'Emaj7',  type: 'maj7', strings: ['o',2,1,1,'o','o'],    fingers: [0,3,1,2,0,0], baseFret: 1 },
  { name: 'Fmaj7',  type: 'maj7', strings: ['x','x',3,2,1,'o'],    fingers: [0,0,3,2,1,0], baseFret: 1 },
  { name: 'F#maj7', type: 'maj7', strings: [2,4,3,3,2,2],          fingers: [1,4,2,3,1,1], baseFret: 2 },
  { name: 'Gmaj7',  type: 'maj7', strings: [3,2,'o','o','o',2],    fingers: [3,2,0,0,0,1], baseFret: 1 },
  { name: 'G#maj7', type: 'maj7', strings: [4,6,5,5,4,4],          fingers: [1,4,2,3,1,1], baseFret: 4 },
  { name: 'Amaj7',  type: 'maj7', strings: ['x','o',2,1,2,'o'],    fingers: [0,0,3,1,2,0], baseFret: 1 },
  { name: 'A#maj7', type: 'maj7', strings: ['x',1,3,2,3,1],        fingers: [0,1,4,2,3,1], baseFret: 1 },
  { name: 'Bmaj7',  type: 'maj7', strings: ['x',2,4,3,4,2],        fingers: [0,1,4,2,3,1], baseFret: 2 },

  // ── MINOR 7TH ─────────────────────────────────────────────────────────────
  { name: 'Cm7',  type: 'm7', strings: ['x',3,5,3,4,3],            fingers: [0,1,3,1,2,1], baseFret: 3 },
  { name: 'C#m7', type: 'm7', strings: ['x',4,6,4,5,4],            fingers: [0,1,3,1,2,1], baseFret: 4 },
  { name: 'Dm7',  type: 'm7', strings: ['x','x','o',2,1,1],        fingers: [0,0,0,2,1,1], baseFret: 1 },
  { name: 'D#m7', type: 'm7', strings: ['x',6,8,6,7,6],            fingers: [0,1,3,1,2,1], baseFret: 6 },
  { name: 'Em7',  type: 'm7', strings: ['o',2,'o','o','o','o'],    fingers: [0,2,0,0,0,0], baseFret: 1 },
  { name: 'Fm7',  type: 'm7', strings: [1,3,1,1,1,1],              fingers: [1,3,1,1,1,1], baseFret: 1 },
  { name: 'F#m7', type: 'm7', strings: [2,4,2,2,2,2],              fingers: [1,3,1,1,1,1], baseFret: 2 },
  { name: 'Gm7',  type: 'm7', strings: [3,5,3,3,3,3],              fingers: [1,3,1,1,1,1], baseFret: 3 },
  { name: 'G#m7', type: 'm7', strings: [4,6,4,4,4,4],              fingers: [1,3,1,1,1,1], baseFret: 4 },
  { name: 'Am7',  type: 'm7', strings: ['x','o',2,'o',1,'o'],      fingers: [0,0,2,0,1,0], baseFret: 1 },
  { name: 'A#m7', type: 'm7', strings: ['x',1,3,1,2,1],            fingers: [0,1,3,1,2,1], baseFret: 1 },
  { name: 'Bm7',  type: 'm7', strings: ['x',2,4,2,3,2],            fingers: [0,1,3,1,2,1], baseFret: 2 },

  // ── DIMINISHED ────────────────────────────────────────────────────────────
  { name: 'Cdim',  type: 'dim', strings: ['x',3,4,5,4,'x'],        fingers: [0,1,2,4,3,0], baseFret: 3 },
  { name: 'C#dim', type: 'dim', strings: ['x',4,5,6,5,'x'],        fingers: [0,1,2,4,3,0], baseFret: 4 },
  { name: 'Ddim',  type: 'dim', strings: ['x','x','o',1,3,1],      fingers: [0,0,0,1,3,2], baseFret: 1 },
  { name: 'D#dim', type: 'dim', strings: ['x','x',1,2,4,2],        fingers: [0,0,1,2,4,3], baseFret: 1 },
  { name: 'Edim',  type: 'dim', strings: ['o',1,2,3,2,'x'],        fingers: [0,1,2,4,3,0], baseFret: 1 },
  { name: 'Fdim',  type: 'dim', strings: [1,2,3,4,3,'x'],          fingers: [1,2,3,4,3,0], baseFret: 1 },
  { name: 'Gdim',  type: 'dim', strings: [3,4,5,3,'x','x'],        fingers: [1,2,4,1,0,0], baseFret: 3 },
  { name: 'Adim',  type: 'dim', strings: ['x','o',1,2,1,2],        fingers: [0,0,1,3,2,4], baseFret: 1 },
  { name: 'Bdim',  type: 'dim', strings: ['x',2,3,4,3,'x'],        fingers: [0,1,2,4,3,0], baseFret: 2 },

  // ── AUGMENTED ─────────────────────────────────────────────────────────────
  { name: 'Caug',  type: 'aug', strings: ['x',3,2,1,1,'x'],        fingers: [0,4,3,1,2,0], baseFret: 1 },
  { name: 'Eaug',  type: 'aug', strings: ['o',3,2,1,1,'o'],        fingers: [0,4,3,1,2,0], baseFret: 1 },
  { name: 'Faug',  type: 'aug', strings: [1,4,3,2,2,1],            fingers: [1,4,3,2,2,1], baseFret: 1 },
  { name: 'Gaug',  type: 'aug', strings: [3,2,1,4,'x','x'],        fingers: [3,2,1,4,0,0], baseFret: 1 },
  { name: 'Aaug',  type: 'aug', strings: ['x','o',3,2,2,1],        fingers: [0,0,3,2,4,1], baseFret: 1 },
  { name: 'Baug',  type: 'aug', strings: ['x',2,1,'o','o','x'],    fingers: [0,2,1,0,0,0], baseFret: 1 },

  // ── SUS2 ──────────────────────────────────────────────────────────────────
  { name: 'Csus2',  type: 'sus2', strings: ['x',3,5,5,3,3],        fingers: [0,1,3,4,1,1], baseFret: 3 },
  { name: 'Dsus2',  type: 'sus2', strings: ['x','x','o',2,3,'o'],  fingers: [0,0,0,1,3,0], baseFret: 1 },
  { name: 'Esus2',  type: 'sus2', strings: ['o',2,2,4,'o','o'],    fingers: [0,1,2,4,0,0], baseFret: 1 },
  { name: 'Fsus2',  type: 'sus2', strings: ['x',8,10,10,8,8],      fingers: [0,1,3,4,1,1], baseFret: 8 },
  { name: 'Gsus2',  type: 'sus2', strings: [3,5,5,'o',3,3],        fingers: [1,3,4,0,1,1], baseFret: 3 },
  { name: 'Asus2',  type: 'sus2', strings: ['x','o',2,2,'o','o'],  fingers: [0,0,1,2,0,0], baseFret: 1 },
  { name: 'Bsus2',  type: 'sus2', strings: ['x',2,4,4,2,2],        fingers: [0,1,3,4,1,1], baseFret: 2 },

  // ── SUS4 ──────────────────────────────────────────────────────────────────
  { name: 'Csus4',  type: 'sus4', strings: ['x',3,3,'o',1,1],      fingers: [0,3,4,0,1,1], baseFret: 1 },
  { name: 'Dsus4',  type: 'sus4', strings: ['x','x','o',2,3,3],    fingers: [0,0,0,1,3,4], baseFret: 1 },
  { name: 'Esus4',  type: 'sus4', strings: ['o',2,2,2,'o','o'],    fingers: [0,1,2,3,0,0], baseFret: 1 },
  { name: 'Fsus4',  type: 'sus4', strings: [1,3,3,3,1,1],          fingers: [1,3,4,2,1,1], baseFret: 1 },
  { name: 'Gsus4',  type: 'sus4', strings: [3,3,'o','o',1,3],      fingers: [2,3,0,0,1,4], baseFret: 1 },
  { name: 'Asus4',  type: 'sus4', strings: ['x','o',2,2,3,'o'],    fingers: [0,0,1,2,3,0], baseFret: 1 },
  { name: 'Bsus4',  type: 'sus4', strings: ['x',2,4,4,5,2],        fingers: [0,1,2,3,4,1], baseFret: 2 },

  // ── ADD9 ──────────────────────────────────────────────────────────────────
  { name: 'Cadd9',  type: 'add9', strings: ['x',3,2,'o',3,'o'],    fingers: [0,3,2,0,4,0], baseFret: 1 },
  { name: 'Dadd9',  type: 'add9', strings: ['x','x','o',2,3,'o'],  fingers: [0,0,0,1,3,0], baseFret: 1 },
  { name: 'Eadd9',  type: 'add9', strings: ['o',2,4,1,'o','o'],    fingers: [0,2,4,1,0,0], baseFret: 1 },
  { name: 'Gadd9',  type: 'add9', strings: [3,2,'o',2,'o',3],      fingers: [2,1,0,3,0,4], baseFret: 1 },
  { name: 'Aadd9',  type: 'add9', strings: ['x','o',2,4,2,'o'],    fingers: [0,0,1,4,2,0], baseFret: 1 },
  { name: 'Badd9',  type: 'add9', strings: ['x',2,4,4,4,2],        fingers: [0,1,3,4,2,1], baseFret: 2 },
];
