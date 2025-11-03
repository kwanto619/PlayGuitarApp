import { Chord } from '@/types';

export const chords: Chord[] = [
  // Major Chords
  { name: 'C', type: 'major', strings: ['o', 3, 2, 'o', 1, 'o'], fingers: [0, 3, 2, 0, 1, 0], baseFret: 1 },
  { name: 'D', type: 'major', strings: ['x', 'x', 'o', 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], baseFret: 1 },
  { name: 'D#', type: 'major', strings: ['x', 'x', 5, 3, 4, 3], fingers: [0, 0, 4, 1, 3, 2], baseFret: 1 },
  { name: 'E', type: 'major', strings: ['o', 2, 2, 1, 'o', 'o'], fingers: [0, 2, 3, 1, 0, 0], baseFret: 1 },
  { name: 'F', type: 'major', strings: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], baseFret: 1 },
  { name: 'G', type: 'major', strings: [3, 2, 'o', 'o', 'o', 3], fingers: [2, 1, 0, 0, 0, 3], baseFret: 1 },
  { name: 'A', type: 'major', strings: ['x', 'o', 2, 2, 2, 'o'], fingers: [0, 0, 1, 2, 3, 0], baseFret: 1 },
  { name: 'B', type: 'major', strings: ['x', 2, 4, 4, 4, 2], fingers: [0, 1, 3, 4, 5, 2], baseFret: 1 },

  // Minor Chords
  { name: 'Am', type: 'minor', strings: ['x', 'o', 2, 2, 1, 'o'], fingers: [0, 0, 2, 3, 1, 0], baseFret: 1 },
  { name: 'Dm', type: 'minor', strings: ['x', 'x', 'o', 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1], baseFret: 1 },
  { name: 'D#m', type: 'minor', strings: ['x', 'x', 4, 3, 4, 2], fingers: [0, 0, 3, 1, 4, 2], baseFret: 1 },
  { name: 'Em', type: 'minor', strings: ['o', 2, 2, 'o', 'o', 'o'], fingers: [0, 1, 2, 0, 0, 0], baseFret: 1 },
  { name: 'Fm', type: 'minor', strings: [1, 3, 3, 1, 1, 1], fingers: [1, 3, 4, 1, 1, 1], baseFret: 1 },
  { name: 'Gm', type: 'minor', strings: [3, 5, 5, 3, 3, 3], fingers: [1, 3, 4, 1, 1, 1], baseFret: 3 },
  { name: 'Bm', type: 'minor', strings: ['x', 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], baseFret: 1 },
  { name: 'Cm', type: 'minor', strings: ['x', 3, 5, 5, 4, 3], fingers: [0, 1, 3, 4, 2, 1], baseFret: 1 },

  // 7th Chords
  { name: 'C7', type: '7th', strings: ['x', 3, 2, 3, 1, 'o'], fingers: [0, 3, 2, 4, 1, 0], baseFret: 1 },
  { name: 'D7', type: '7th', strings: ['x', 'x', 'o', 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3], baseFret: 1 },
  { name: 'E7', type: '7th', strings: ['o', 2, 'o', 1, 'o', 'o'], fingers: [0, 2, 0, 1, 0, 0], baseFret: 1 },
  { name: 'G7', type: '7th', strings: [3, 2, 'o', 'o', 'o', 1], fingers: [3, 2, 0, 0, 0, 1], baseFret: 1 },
  { name: 'A7', type: '7th', strings: ['x', 'o', 2, 'o', 2, 'o'], fingers: [0, 0, 2, 0, 3, 0], baseFret: 1 },
  { name: 'Am7', type: '7th', strings: ['x', 'o', 2, 'o', 1, 'o'], fingers: [0, 0, 2, 0, 1, 0], baseFret: 1 },
  { name: 'B7', type: '7th', strings: ['x', 2, 1, 2, 'o', 2], fingers: [0, 2, 1, 3, 0, 4], baseFret: 1 },

  // Suspended Chords
  { name: 'Dsus4', type: 'sus', strings: ['x', 'x', 'o', 2, 3, 3], fingers: [0, 0, 0, 1, 3, 4], baseFret: 1 },
  { name: 'Esus4', type: 'sus', strings: ['o', 2, 2, 2, 'o', 'o'], fingers: [0, 1, 2, 3, 0, 0], baseFret: 1 },
  { name: 'Asus4', type: 'sus', strings: ['x', 'o', 2, 2, 3, 'o'], fingers: [0, 0, 1, 2, 3, 0], baseFret: 1 },
  { name: 'Gsus4', type: 'sus', strings: [3, 3, 'o', 'o', 1, 3], fingers: [3, 4, 0, 0, 1, 5], baseFret: 1 },
];
