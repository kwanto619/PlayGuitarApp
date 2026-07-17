'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

// Pre-email accounts were registered as <username>@guitar-app.local
const LEGACY_EMAIL_DOMAIN = 'guitar-app.local';

type Mode = 'signin' | 'signup' | 'forgot';

const TITLES: Record<Mode, string> = {
  signin: 'Sign In',
  signup: 'Create Account',
  forgot: 'Reset Password',
};

export default function Auth() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const switchMode = (m: Mode) => { setMode(m); setMessage(''); setIsError(false); };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMessage(''); setIsError(false);
    try {
      if (mode === 'signup') {
        const uname = username.trim().toLowerCase();
        if (!/^[a-z0-9_-]{3,24}$/.test(uname)) {
          throw new Error('Username must be 3–24 chars: letters, numbers, _ or -');
        }
        const mail = email.trim().toLowerCase();
        const { data: taken } = await supabase
          .from('profiles').select('id').eq('username', uname).maybeSingle();
        if (taken) throw new Error('Username already taken.');

        const { data, error } = await supabase.auth.signUp({
          email: mail,
          password,
          options: {
            data: { username: uname },
            emailRedirectTo: `${window.location.origin}/auth/confirm`,
          },
        });
        if (error) {
          if (error.message.toLowerCase().includes('registered')) {
            throw new Error('This email is already registered. Sign in instead.');
          }
          throw error;
        }
        // With email confirmation on, Supabase masks duplicate emails as a
        // success with an identity-less user.
        if (data.user && data.user.identities?.length === 0) {
          throw new Error('This email is already registered. Sign in instead.');
        }
        if (data.session) {
          // Email confirmation disabled in Supabase — signed in immediately.
          router.push('/');
          return;
        }
        setMode('signin');
        setMessage('Check your email — click the confirmation link, then sign in.');
        setIsError(false);
        return;
      }

      if (mode === 'forgot') {
        const mail = email.trim().toLowerCase();
        if (!mail.includes('@') || mail.endsWith(`@${LEGACY_EMAIL_DOMAIN}`)) {
          throw new Error('Enter the email address of your account.');
        }
        const { error } = await supabase.auth.resetPasswordForEmail(mail, {
          redirectTo: `${window.location.origin}/auth/reset`,
        });
        if (error) throw error;
        setMode('signin');
        setMessage('If that email has an account, a reset link is on its way.');
        setIsError(false);
        return;
      }

      const id = loginId.trim().toLowerCase();
      const mail = id.includes('@') ? id : `${id}@${LEGACY_EMAIL_DOMAIN}`;
      const { error: sErr } = await supabase.auth.signInWithPassword({ email: mail, password });
      if (sErr) {
        if (sErr.message.toLowerCase().includes('confirmed')) {
          throw new Error('Email not confirmed yet — check your inbox for the link.');
        }
        throw new Error('Invalid email/username or password');
      }
      router.push('/');
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
            {TITLES[mode]}
          </h1>
        </div>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {mode === 'signup' && (
            <>
              <div>
                <label style={labelStyle}>Username</label>
                <input
                  type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  autoFocus required minLength={3} pattern="[a-zA-Z0-9_-]+"
                  placeholder="your-username" style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  required placeholder="you@example.com" style={inputStyle}
                />
              </div>
            </>
          )}

          {mode === 'signin' && (
            <div>
              <label style={labelStyle}>Email or Username</label>
              <input
                type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)}
                autoFocus required placeholder="you@example.com" style={inputStyle}
              />
            </div>
          )}

          {mode === 'forgot' && (
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                autoFocus required placeholder="you@example.com" style={inputStyle}
              />
              <p style={{ margin: '8px 0 0', fontSize: '0.82rem', color: 'var(--cream-muted)' }}>
                We&apos;ll email you a link to set a new password.
              </p>
            </div>
          )}

          {mode !== 'forgot' && (
            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required minLength={6} placeholder="••••••" style={inputStyle}
              />
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  style={{
                    marginTop: '8px', padding: 0,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--cream-muted)', fontSize: '0.82rem',
                    fontFamily: 'var(--font-cormorant, Georgia, serif)',
                    letterSpacing: '0.06em', textDecoration: 'underline',
                  }}
                >
                  Forgot password?
                </button>
              )}
            </div>
          )}

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
            {loading ? 'Loading…'
              : mode === 'signup' ? 'Create Account'
              : mode === 'forgot' ? 'Send Reset Link'
              : 'Sign In'}
          </button>
        </form>

        <button
          onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
          style={{
            width: '100%', marginTop: '20px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--cream-muted)',
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: '0.88rem', letterSpacing: '0.1em',
          }}
        >
          {mode === 'signin' ? "No account? Create one" : 'Have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
