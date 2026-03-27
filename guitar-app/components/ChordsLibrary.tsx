'use client';

import { useState } from 'react';
import { chords } from '@/data/chords';
import { Chord } from '@/types';
import ChordDiagram from './ChordDiagram';

const filterTypes = ['all', 'major', 'minor', '7th', 'maj7', 'm7', 'dim', 'aug', 'sus2', 'sus4', 'add9'] as const;
type FilterType = typeof filterTypes[number];

const filterLabels: Record<FilterType, string> = {
  all: 'All',
  major: 'Major',
  minor: 'Minor',
  '7th': '7th',
  maj7: 'Maj7',
  m7: 'Min7',
  dim: 'Dim',
  aug: 'Aug',
  sus2: 'Sus2',
  sus4: 'Sus4',
  add9: 'Add9',
};

export default function ChordsLibrary() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  const filteredChords = chords.filter((chord) => {
    const matchesFilter = filter === 'all' || chord.type === filter;
    const matchesSearch = chord.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const playChord = (chord: Chord) => {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AC();
    const openStringFrequencies = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];
    const now = audioContext.currentTime;
    const duration = 2.0;

    chord.strings.forEach((fret, stringIndex) => {
      if (fret === 'x') return;
      const fretNumber = fret === 'o' ? 0 : fret;
      const frequency = openStringFrequencies[stringIndex] * Math.pow(2, fretNumber / 12);
      const oscillator = audioContext.createOscillator();
      const gainNode   = audioContext.createGain();
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
      {/* Search */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '560px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chords — Am, C7, D..."
            style={{
              width: '100%',
              padding: '14px 20px 14px 48px',
              fontFamily: 'var(--font-cormorant, Georgia, serif)',
              fontSize: '1.1rem',
              letterSpacing: '0.05em',
              background: 'var(--bg-input)',
              border: '1px solid var(--gold-border-mid)',
              color: 'var(--cream)',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--gold)';
              e.target.style.boxShadow = '0 0 0 2px rgba(0,196,180,0.12)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--gold-border-mid)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <span style={{
            position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--gold-dim)', fontSize: '1rem', pointerEvents: 'none',
          }}>♯</span>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: '6px',
        marginBottom: '36px', flexWrap: 'wrap',
      }}>
        {filterTypes.map((type) => {
          const isActive = filter === type;
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              style={{
                padding: '10px 16px',
                fontFamily: 'var(--font-cormorant, Georgia, serif)',
                fontSize: '0.82rem',
                fontWeight: isActive ? 600 : 400,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                border: `1px solid ${isActive ? 'var(--gold)' : 'var(--gold-border)'}`,
                transition: 'all 0.15s',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(0,196,180,0.2), rgba(0,196,180,0.08))'
                  : 'transparent',
                color: isActive ? 'var(--gold-bright)' : 'var(--cream-muted)',
                minHeight: '44px',
              }}
            >
              {filterLabels[type]}
            </button>
          );
        })}
      </div>

      {/* Chord grid */}
      {filteredChords.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
          gap: '20px',
        }}>
          {filteredChords.map((chord) => (
            <ChordCard key={chord.name} chord={chord} onPlay={playChord} />
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: '1.5rem',
          color: 'var(--cream-muted)',
          letterSpacing: '0.05em',
        }}>
          No chords found
        </div>
      )}
    </div>
  );
}

function ChordCard({ chord, onPlay }: { chord: Chord; onPlay: (c: Chord) => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${hovered ? 'var(--gold-border-mid)' : 'var(--gold-border)'}`,
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered
          ? '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,196,180,0.08)'
          : '0 4px 16px rgba(0,0,0,0.4)',
        cursor: 'default',
      }}
    >
      {/* Chord name */}
      <h3 style={{
        fontFamily: 'var(--font-cormorant, Georgia, serif)',
        fontSize: '2.2rem',
        fontWeight: 600,
        color: 'var(--gold)',
        margin: 0,
        letterSpacing: '0.04em',
        textShadow: hovered ? '0 0 20px rgba(0,196,180,0.25)' : 'none',
        transition: 'text-shadow 0.2s',
      }}>
        {chord.name}
      </h3>

      {/* Diagram */}
      <ChordDiagram chord={chord} />

      {/* Play button */}
      <button
        onClick={() => onPlay(chord)}
        style={{
          width: '100%',
          padding: '12px 0',
          minHeight: '44px',
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: '0.85rem',
          fontWeight: 600,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          border: '1px solid var(--gold-border-mid)',
          background: 'linear-gradient(135deg, rgba(0,130,120,0.5), rgba(0,90,83,0.3))',
          color: 'var(--gold-bright)',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,196,180,0.25), rgba(0,196,180,0.1))';
          e.currentTarget.style.borderColor = 'var(--gold)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,130,120,0.5), rgba(0,90,83,0.3))';
          e.currentTarget.style.borderColor = 'var(--gold-border-mid)';
        }}
      >
        ♪ Play
      </button>
    </div>
  );
}
