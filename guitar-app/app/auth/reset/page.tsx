'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Status = 'working' | 'ready' | 'done' | 'error';

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

export default function ResetPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('working');
  const [detail, setDetail] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let done = false;
    const finish = (ok: boolean, msg = '') => {
      if (done) return;
      done = true;
      setStatus(ok ? 'ready' : 'error');
      setDetail(msg);
    };

    const hash = new URLSearchParams(window.location.hash.slice(1));
    const qs = new URLSearchParams(window.location.search);

    const errDesc = hash.get('error_description') || qs.get('error_description');
    if (errDesc) { finish(false, errDesc); return; }

    const code = qs.get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .then(({ error }) => finish(!error, error?.message ?? ''));
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) finish(true); });

    const timer = setTimeout(
      () => finish(false, 'This reset link is invalid or has expired. Request a new one.'),
      8000,
    );
    return () => { sub.subscription.unsubscribe(); clearTimeout(timer); };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (password !== repeat) { setFormError('Passwords do not match.'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    setStatus('done');
    setTimeout(() => router.replace('/'), 1800);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      background: 'var(--bg-deep)',
    }}>
      <div style={{
        width: '100%', maxWidth: '440px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--gold-border)',
        padding: 'clamp(32px, 5vw, 48px)',
        boxShadow: '0 24px 80px rgba(23,58,54,0.06)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '0.6rem', letterSpacing: '0.5em', color: 'var(--gold-dim)', textTransform: 'uppercase', marginBottom: '10px' }}>
          Guitar Companion
        </div>
        <h1 style={{
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: '1.7rem', fontWeight: 500, letterSpacing: '0.08em',
          color: 'var(--gold-bright)', margin: '0 0 18px',
        }}>
          {status === 'working' && 'Opening reset link…'}
          {status === 'ready' && 'Set a New Password'}
          {status === 'done' && 'Password updated'}
          {status === 'error' && 'Link problem'}
        </h1>

        {status === 'working' && (
          <p style={{ color: 'var(--cream-muted)', fontSize: '0.95rem' }}>One moment.</p>
        )}

        {status === 'ready' && (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'left' }}>
            <div>
              <label style={labelStyle}>New Password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                autoFocus required minLength={6} placeholder="••••••" style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Repeat Password</label>
              <input
                type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)}
                required minLength={6} placeholder="••••••" style={inputStyle}
              />
            </div>
            {formError && (
              <div style={{
                padding: '10px 14px',
                border: '1px solid rgba(224,72,72,0.4)',
                background: 'rgba(224,72,72,0.07)',
                color: 'var(--red-tuning)', fontSize: '0.9rem',
              }}>
                {formError}
              </div>
            )}
            <button
              type="submit" disabled={saving}
              style={{
                padding: '14px 0',
                fontFamily: 'var(--font-cormorant, Georgia, serif)',
                fontSize: '1rem', fontWeight: 600, letterSpacing: '0.25em',
                textTransform: 'uppercase', cursor: saving ? 'wait' : 'pointer',
                border: '1px solid var(--gold-border-mid)',
                background: saving ? 'transparent' : 'linear-gradient(135deg, rgba(13,148,136,0.16), rgba(13,148,136,0.04))',
                color: saving ? 'var(--cream-muted)' : 'var(--gold-bright)',
                opacity: saving ? 0.6 : 1, transition: 'all 0.2s',
              }}
            >
              {saving ? 'Saving…' : 'Save Password'}
            </button>
          </form>
        )}

        {status === 'done' && (
          <p style={{ color: 'var(--phosphor)', fontSize: '0.95rem' }}>
            You&apos;re signed in — taking you in…
          </p>
        )}

        {status === 'error' && (
          <>
            <p style={{ color: 'var(--red-tuning)', fontSize: '0.95rem' }}>{detail}</p>
            <Link href="/auth" style={{
              display: 'inline-block', marginTop: '16px',
              color: 'var(--gold-bright)',
              fontFamily: 'var(--font-cormorant, Georgia, serif)',
              letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: '0.85rem',
            }}>
              Back to Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
