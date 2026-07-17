'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Status = 'working' | 'ok' | 'error';

export default function ConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('working');
  const [detail, setDetail] = useState('');

  useEffect(() => {
    let done = false;
    const finish = (ok: boolean, msg = '') => {
      if (done) return;
      done = true;
      setStatus(ok ? 'ok' : 'error');
      setDetail(msg);
      if (ok) setTimeout(() => router.replace('/'), 1800);
    };

    const hash = new URLSearchParams(window.location.hash.slice(1));
    const qs = new URLSearchParams(window.location.search);

    const errDesc = hash.get('error_description') || qs.get('error_description');
    if (errDesc) { finish(false, errDesc); return; }

    // PKCE-style links carry ?code=...; implicit-flow links carry tokens in
    // the hash, which the supabase client picks up on its own.
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
      () => finish(false, 'This confirmation link is invalid or has expired.'),
      8000,
    );
    return () => { sub.subscription.unsubscribe(); clearTimeout(timer); };
  }, [router]);

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
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
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
          {status === 'working' && 'Confirming your email…'}
          {status === 'ok' && 'Email confirmed'}
          {status === 'error' && 'Confirmation failed'}
        </h1>

        {status === 'working' && (
          <p style={{ color: 'var(--cream-muted)', fontSize: '0.95rem' }}>One moment.</p>
        )}
        {status === 'ok' && (
          <p style={{ color: 'var(--phosphor)', fontSize: '0.95rem' }}>
            Your account is active — taking you in…
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
