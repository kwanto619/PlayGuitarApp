'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/** Password field with a show/hide toggle. */
function PasswordInput({ value, onChange, placeholder, autoFocus, autoComplete }: {
  value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean; autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)}
        required minLength={6} placeholder={placeholder ?? '••••••'} autoFocus={autoFocus} autoComplete={autoComplete}
        style={{ ...inputStyle, paddingRight: '46px' }}
      />
      <button
        type="button" onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'} title={show ? 'Hide password' : 'Show password'}
        style={{
          position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
          width: '36px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--cream-muted)',
        }}
      >
        <EyeIcon open={show} />
      </button>
    </div>
  );
}

export default function Auth({ initialMode = 'signin' }: { initialMode?: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  // Allow deep-linking straight into signup (/auth?mode=signup). Read after
  // mount to keep the statically prerendered page hydration-safe.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mode') === 'signup') {
      setMode('signup');
    }
  }, []);

  // Dedicated /login and /register routes: keep the URL in step with the mode
  // so browser back/forward and shared links behave like real pages.
  const switchMode = (m: Mode) => {
    setMode(m); setMessage(''); setIsError(false);
    if (typeof window !== 'undefined') {
      const target = m === 'signup' ? '/register' : '/login';
      if (window.location.pathname !== target) window.history.replaceState(null, '', target);
    }
  };

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
        if (password !== confirm) throw new Error('Passwords do not match.');
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
        boxShadow: '0 24px 80px rgba(23,58,54,0.06)',
      }}>
        {([
          { top: 8,    left: 8,   borderTop:    '1px solid var(--gold-border-mid)', borderLeft:   '1px solid var(--gold-border-mid)' },
          { top: 8,    right: 8,  borderTop:    '1px solid var(--gold-border-mid)', borderRight:  '1px solid var(--gold-border-mid)' },
          { bottom: 8, left: 8,   borderBottom: '1px solid var(--gold-border-mid)', borderLeft:   '1px solid var(--gold-border-mid)' },
          { bottom: 8, right: 8,  borderBottom: '1px solid var(--gold-border-mid)', borderRight:  '1px solid var(--gold-border-mid)' },
        ] as React.CSSProperties[]).map((s, i) => <div key={i} style={{ position: 'absolute', width: 20, height: 20, ...s }} />)}

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <Link href="/" style={{
            display: 'inline-block', textDecoration: 'none',
            fontSize: '0.6rem', letterSpacing: '0.5em', color: 'var(--gold-dim)', textTransform: 'uppercase', marginBottom: '10px',
          }}>
            ← Songcord
          </Link>
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
                  autoFocus required minLength={3} pattern="[a-zA-Z0-9_-]+" autoComplete="username"
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
                autoFocus required placeholder="you@example.com" autoComplete="username" style={inputStyle}
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
              <PasswordInput value={password} onChange={setPassword} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
              {mode === 'signup' && (
                <div style={{ marginTop: '18px' }}>
                  <label style={labelStyle}>Confirm Password</label>
                  <PasswordInput value={confirm} onChange={setConfirm} placeholder="Repeat password" autoComplete="new-password" />
                  {confirm && confirm !== password && (
                    <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--red-tuning)' }}>Passwords do not match.</p>
                  )}
                </div>
              )}
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
              background: loading ? 'transparent' : 'linear-gradient(135deg, rgba(13,148,136,0.16), rgba(13,148,136,0.04))',
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
