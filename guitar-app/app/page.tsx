'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import Tuner from '@/components/Tuner';
import ChordsLibrary from '@/components/ChordsLibrary';
import SongsLibrary from '@/components/SongsLibrary';
import Auth from '@/components/Auth';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'tuner' | 'chords' | 'songs'>('tuner');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-6xl font-extrabold text-custom-orange drop-shadow-2xl">
            🎸 Guitar Companion
          </h1>
          <button
            onClick={handleSignOut}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-semibold transition-all shadow-lg hover:shadow-xl"
          >
            Sign Out
          </button>
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
