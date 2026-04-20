'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Song } from '@/types';
import { loadFeed } from '@/lib/storage';

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)     return `${Math.floor(s)}s ago`;
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function FeedPage() {
  const [songs,   setSongs]   = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadFeed().then((s) => { setSongs(s); setLoading(false); }); }, []);

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-base) 100%)',
        borderBottom: '1px solid var(--gold-border)',
        padding: '0 clamp(20px, 4vw, 48px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px',
      }}>
        <Link href="/" style={topBtn}>← Home</Link>
        <span style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.78rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--cream-soft)' }}>
          ♪ Feed
        </span>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: 'clamp(32px, 5vw, 64px) clamp(16px, 4vw, 48px)' }}>
        {loading ? (
          <div style={centerBox}>Loading…</div>
        ) : songs.length === 0 ? (
          <div style={centerBox}>
            Your feed is empty. <Link href="/search" style={{ color: 'var(--gold-bright)' }}>Find members</Link> to follow.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {songs.map((s) => (
              <Link key={s.id} href={`/songs/${s.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  gap: '16px', padding: '16px 20px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--gold-border)',
                  transition: 'border-color 0.15s',
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--cream-muted)', letterSpacing: '0.1em', marginBottom: '4px' }}>
                      @{s.uploaderUsername ?? 'unknown'} · {timeAgo(s.createdAt)}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-cormorant, Georgia, serif)',
                      fontSize: '1.25rem', fontWeight: 600, color: 'var(--gold-bright)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {s.title}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-cormorant, Georgia, serif)',
                      fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--cream-muted)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {s.artist}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gold-dim)', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
                    {s.language === 'greek' ? 'GR' : 'EN'}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const topBtn: React.CSSProperties = {
  padding: '8px 18px', fontFamily: 'var(--font-cormorant, Georgia, serif)',
  fontSize: '0.9rem', fontWeight: 500, letterSpacing: '0.18em',
  textTransform: 'uppercase', cursor: 'pointer',
  border: '1px solid var(--gold-border-mid)',
  background: 'transparent', color: 'var(--cream-muted)',
  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px',
};

const centerBox: React.CSSProperties = {
  textAlign: 'center', padding: '80px 20px',
  fontFamily: 'var(--font-cormorant, Georgia, serif)',
  color: 'var(--cream-muted)', fontSize: '1.1rem', letterSpacing: '0.05em',
  border: '1px solid var(--gold-border)', background: 'var(--bg-surface)',
};
