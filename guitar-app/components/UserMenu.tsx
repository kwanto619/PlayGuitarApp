'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import NotificationBell from './NotificationBell';

function UserIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8.5" r="4" />
      <path d="M3.5 20.5c1.6-4.3 5-6.5 8.5-6.5s6.9 2.2 8.5 6.5" />
    </svg>
  );
}

async function fileToResizedDataUrl(file: File, max = 192): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(max / bitmap.width, max / bitmap.height, 1);
  const w = Math.max(1, Math.round(bitmap.width * ratio));
  const h = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export default function UserMenu() {
  const { user, avatarUrl, signOut, setAvatar } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <Link href="/auth" style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        padding: '9px 14px',
        fontFamily: 'var(--font-cormorant, Georgia, serif)',
        fontSize: '0.8rem', letterSpacing: '0.18em', textTransform: 'uppercase',
        border: '1px solid var(--gold-border-mid)',
        background: 'linear-gradient(135deg, rgba(0,130,120,0.5), rgba(0,90,83,0.3))',
        color: 'var(--gold-bright)', textDecoration: 'none',
      }}>
        <UserIcon />
        Sign In
      </Link>
    );
  }

  const onPick = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setBusy(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file, 192);
      await setAvatar(dataUrl);
    } catch (err) {
      console.error('Avatar update failed', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="user-menu" style={{
      display: 'inline-flex', alignItems: 'center', gap: '8px',
      fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.78rem',
      letterSpacing: '0.16em', textTransform: 'uppercase',
    }}>
      <NotificationBell />

      <button
        type="button"
        onClick={onPick}
        disabled={busy}
        title="Change profile picture"
        aria-label="Change profile picture"
        style={{
          width: '36px', height: '36px', borderRadius: '50%',
          padding: 0, cursor: busy ? 'wait' : 'pointer',
          border: '1px solid var(--gold-border-mid)',
          background: avatarUrl
            ? `center/cover no-repeat url(${avatarUrl})`
            : 'linear-gradient(135deg, rgba(0,130,120,0.45), rgba(0,90,83,0.25))',
          color: 'var(--gold-bright)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', flex: '0 0 auto',
          opacity: busy ? 0.6 : 1,
        }}
      >
        {!avatarUrl && <UserIcon size={18} />}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onFile}
        style={{ display: 'none' }}
      />

      <button
        onClick={signOut}
        title="Sign out"
        aria-label="Sign out"
        className="um-signout"
        style={{
          padding: '7px 12px', cursor: 'pointer', flex: '0 0 auto',
          border: '1px solid var(--gold-border-mid)',
          background: 'rgba(224,72,72,0.08)',
          color: '#ff8080',
          fontFamily: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontWeight: 600,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </div>
  );
}
