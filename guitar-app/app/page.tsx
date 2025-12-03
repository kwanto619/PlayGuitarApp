'use client';

import { useState } from 'react';
import Tuner from '@/components/Tuner';
import ChordsLibrary from '@/components/ChordsLibrary';
import SongsLibrary from '@/components/SongsLibrary';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'tuner' | 'chords' | 'songs'>('tuner');

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center items-center mb-12">
          <h1 className="text-6xl font-extrabold text-custom-orange drop-shadow-2xl">
            🎸 Guitar Companion
          </h1>
        </div>

        <div className="flex justify-center gap-4 mb-10">
          <button
            onClick={() => setActiveTab('tuner')}
            className={`px-8 py-4 rounded-full font-bold text-lg transition-all ${
              activeTab === 'tuner'
                ? 'bg-custom-orange text-white shadow-2xl scale-110'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:scale-105'
            }`}
          >
            Tuner
          </button>
          <button
            onClick={() => setActiveTab('chords')}
            className={`px-8 py-4 rounded-full font-bold text-lg transition-all ${
              activeTab === 'chords'
                ? 'bg-custom-orange text-white shadow-2xl scale-110'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:scale-105'
            }`}
          >
            Chords
          </button>
          <button
            onClick={() => setActiveTab('songs')}
            className={`px-8 py-4 rounded-full font-bold text-lg transition-all ${
              activeTab === 'songs'
                ? 'bg-custom-orange text-white shadow-2xl scale-110'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:scale-105'
            }`}
          >
            My Songs
          </button>
        </div>

        <div>
          {activeTab === 'tuner' && <Tuner />}
          {activeTab === 'chords' && <ChordsLibrary />}
          {activeTab === 'songs' && <SongsLibrary />}
        </div>
      </div>
    </main>
  );
}
