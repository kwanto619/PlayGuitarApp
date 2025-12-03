'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Auth() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Create a fake email from username for Supabase (since it requires email)
    const email = `${username.toLowerCase()}@guitar-app.local`;

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
            },
            emailRedirectTo: undefined, // Don't send confirmation email
          },
        });
        if (error) {
          console.error('Signup error:', error);
          if (error.message.includes('already registered')) {
            throw new Error('Username already taken. Please choose another one.');
          }
          throw error;
        }
        setMessage('Account created successfully!');
        // Auto sign in after signup
        setTimeout(() => {
          handleSignIn(email, password);
        }, 1000);
      } else {
        await handleSignIn(email, password);
      }
    } catch (error) {
      console.error('Auth error:', error);
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      if (error.message.includes('Invalid') || error.message.includes('credentials')) {
        throw new Error('Invalid username or password');
      }
      throw error;
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
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            pattern="[a-zA-Z0-9_-]+"
            title="Username can only contain letters, numbers, underscores, and hyphens"
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
            {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-4 rounded-xl text-center ${
            message.includes('successfully') || message.includes('Successfully')
              ? 'bg-green-900 text-green-100'
              : 'bg-red-900 text-red-100'
          }`}>
            {message}
          </div>
        )}

        <button
          onClick={() => {
            setIsSignUp(!isSignUp);
            setMessage('');
          }}
          className="w-full mt-6 text-gray-400 hover:text-white transition-colors"
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
        </button>
      </div>
    </div>
  );
}
