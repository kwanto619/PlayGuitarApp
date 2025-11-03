'use client';

import { useState } from 'react';
import { chords } from '@/data/chords';
import { Chord } from '@/types';
import ChordDiagram from './ChordDiagram';

export default function ChordsLibrary() {
  const [filter, setFilter] = useState<'all' | 'major' | 'minor' | '7th' | 'sus'>('all');
  const [search, setSearch] = useState('');

  const filteredChords = chords.filter((chord) => {
    const matchesFilter = filter === 'all' || chord.type === filter;
    const matchesSearch = chord.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const playChord = (chord: Chord) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const openStringFrequencies = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];
    const now = audioContext.currentTime;
    const duration = 2.0;

    chord.strings.forEach((fret, stringIndex) => {
      if (fret === 'x') return;

      const fretNumber = fret === 'o' ? 0 : fret;
      const frequency = openStringFrequencies[stringIndex] * Math.pow(2, fretNumber / 12);

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'triangle';

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

      oscillator.start(now + stringIndex * 0.05);
      oscillator.stop(now + duration);
    });
  };

  return (
    <div>
      <div className="mb-8">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for a chord (e.g., Am, C7, D)..."
          className="w-full max-w-2xl mx-auto block px-8 py-4 text-lg rounded-full shadow-xl focus:shadow-2xl focus:-translate-y-1 transition-all outline-none border-2 border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:border-custom-orange"
        />
      </div>

      <div className="flex justify-center gap-3 mb-8 flex-wrap">
        {(['all', 'major', 'minor', '7th', 'sus'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-7 py-3 rounded-full font-semibold transition-all ${
              filter === type
                ? 'bg-custom-orange text-white shadow-lg shadow-custom-orange/40'
                : 'bg-gray-700 text-gray-300 hover:-translate-y-1 hover:shadow-lg hover:bg-gray-600'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredChords.map((chord) => (
          <div
            key={chord.name}
            className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl hover:-translate-y-2 hover:shadow-2xl hover:border-custom-orange transition-all"
          >
            <h3 className="text-3xl font-bold text-custom-orange text-center mb-4">{chord.name}</h3>
            <div className="flex justify-center mb-4">
              <ChordDiagram chord={chord} />
            </div>
            <button
              onClick={() => playChord(chord)}
              className="w-full bg-custom-orange hover:bg-custom-orange-hover text-white py-2 rounded-full font-semibold hover:scale-105 transition-all shadow-md hover:shadow-lg"
            >
              ♪ Play Sound
            </button>
          </div>
        ))}
      </div>

      {filteredChords.length === 0 && (
        <div className="text-center text-gray-400 text-2xl py-20">No chords found</div>
      )}
    </div>
  );
}
