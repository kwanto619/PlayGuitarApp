'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  fontFamily: 'var(--font-cormorant, Georgia, serif)',
  fontSize: '1.05rem',
  background: 'var(--bg-input)',
  border: '1px solid var(--gold-border-mid)',
  color: 'var(--cream)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.65rem',
  letterSpacing: '0.4em',
  textTransform: 'uppercase',
  color: 'var(--gold-dim)',
  fontFamily: 'var(--font-cormorant, Georgia, serif)',
  marginBottom: '6px',
};

export default function Auth() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMessage(''); setIsError(false);
    const uname = username.trim().toLowerCase();
    if (!/^[a-z0-9_-]{3,24}$/.test(uname)) {
      setMessage('Username must be 3–24 chars: letters, numbers, _ or -');
      setIsError(true); setLoading(false); return;
    }
    const email = `${uname}@guitar-app.local`;
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { username: uname } },
        });
        if (error) {
          if (error.message.toLowerCase().includes('registered')) throw new Error('Username already taken.');
          throw error;
        }
      }
      const { error: sErr } = await supabase.auth.signInWithPassword({ email, password });
      if (sErr) throw new Error('Invalid username or password');
    } catch (err) {
      setMessage((err as Error).message);
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      background: 'var(--bg-deep)',
    }}>
      <div style={{
        position: 'relative',
        width: '100%', maxWidth: '440px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--gold-border)',
        padding: 'clamp(32px, 5vw, 48px)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        {([
          { top: 8,    left: 8,   borderTop:    '1px solid var(--gold-border-mid)', borderLeft:   '1px solid var(--gold-border-mid)' },
          { top: 8,    right: 8,  borderTop:    '1px solid var(--gold-border-mid)', borderRight:  '1px solid var(--gold-border-mid)' },
          { bottom: 8, left: 8,   borderBottom: '1px solid var(--gold-border-mid)', borderLeft:   '1px solid var(--gold-border-mid)' },
          { bottom: 8, right: 8,  borderBottom: '1px solid var(--gold-border-mid)', borderRight:  '1px solid var(--gold-border-mid)' },
        ] as React.CSSProperties[]).map((s, i) => <div key={i} style={{ position: 'absolute', width: 20, height: 20, ...s }} />)}

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.5em', color: 'var(--gold-dim)', textTransform: 'uppercase', marginBottom: '10px' }}>
            Guitar Companion
          </div>
          <h1 style={{
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: '2rem', fontWeight: 500, letterSpacing: '0.08em',
            color: 'var(--gold-bright)', margin: 0,
          }}>
            {isSignUp ? 'Create Account' : 'Sign In'}
          </h1>
        </div>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={labelStyle}>Username</label>
            <input
              type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              autoFocus required minLength={3} pattern="[a-zA-Z0-9_-]+"
              placeholder="your-username" style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={6} placeholder="••••••" style={inputStyle}
            />
          </div>

          {message && (
            <div style={{
              padding: '10px 14px',
              border: `1px solid ${isError ? 'rgba(224,72,72,0.4)' : 'rgba(80,232,128,0.3)'}`,
              background: isError ? 'rgba(224,72,72,0.07)' : 'rgba(80,232,128,0.07)',
              color: isError ? 'var(--red-tuning)' : 'var(--phosphor)',
              fontSize: '0.9rem',
            }}>
              {message}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              padding: '14px 0',
              fontFamily: 'var(--font-cormorant, Georgia, serif)',
              fontSize: '1rem', fontWeight: 600, letterSpacing: '0.25em',
              textTransform: 'uppercase', cursor: loading ? 'wait' : 'pointer',
              border: '1px solid var(--gold-border-mid)',
              background: loading ? 'transparent' : 'linear-gradient(135deg, rgba(0,130,120,0.6), rgba(0,90,83,0.4))',
              color: loading ? 'var(--cream-muted)' : 'var(--gold-bright)',
              opacity: loading ? 0.6 : 1, transition: 'all 0.2s',
            }}
          >
            {loading ? 'Loading…' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <button
          onClick={() => { setIsSignUp(!isSignUp); setMessage(''); setIsError(false); }}
          style={{
            width: '100%', marginTop: '20px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--cream-muted)',
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: '0.88rem', letterSpacing: '0.1em',
          }}
        >
          {isSignUp ? 'Have an account? Sign in' : "No account? Create one"}
        </button>
      </div>
    </div>
  );
}
