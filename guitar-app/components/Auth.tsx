'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setMessage('Successfully logged in!');
      }
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center p-6">
      <div className="bg-gray-800 border border-gray-700 rounded-3xl p-10 shadow-2xl max-w-md w-full">
        <h1 className="text-5xl font-extrabold text-custom-orange text-center mb-8">
          🎸 Guitar Companion
        </h1>

        <h2 className="text-2xl font-bold text-white text-center mb-6">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h2>

        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-6 py-3 rounded-xl border-2 border-gray-600 bg-gray-900 text-white placeholder-gray-500 focus:border-custom-orange outline-none text-lg"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-6 py-3 rounded-xl border-2 border-gray-600 bg-gray-900 text-white placeholder-gray-500 focus:border-custom-orange outline-none text-lg"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-custom-orange hover:bg-custom-orange-hover text-white py-4 rounded-xl font-semibold text-lg hover:scale-[1.02] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-4 rounded-xl text-center ${
            message.includes('Successfully') || message.includes('Check your email')
              ? 'bg-green-900 text-green-100'
              : 'bg-red-900 text-red-100'
          }`}>
            {message}
          </div>
        )}

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full mt-6 text-gray-400 hover:text-white transition-colors"
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
}
