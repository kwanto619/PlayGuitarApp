'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Profile } from '@/types';
import { loadProfile, loadFollowing } from '@/lib/storage';

export default function FollowingPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const [list, setList] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const p = await loadProfile(username);
      if (p) setList(await loadFollowing(p.id));
      setLoading(false);
    })();
  }, [username]);

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-base) 100%)',
        borderBottom: '1px solid var(--gold-border)',
        padding: '0 clamp(20px, 4vw, 48px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px',
      }}>
        <Link href={`/u/${username}`} style={topBtn}>← @{username}</Link>
        <span style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.78rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--cream-soft)' }}>
          Following
        </span>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: 'clamp(32px, 5vw, 64px) clamp(16px, 4vw, 48px)' }}>
        {loading ? (
          <div style={centerBox}>Loading…</div>
        ) : list.length === 0 ? (
          <div style={centerBox}>Not following anyone yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {list.map((p) => (
              <Link key={p.id} href={`/u/${p.username}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '14px 18px',
                  border: '1px solid var(--gold-border)',
                  background: 'var(--bg-card)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-cormorant, Georgia, serif)',
                      fontSize: '1.05rem', fontWeight: 600, color: 'var(--gold-bright)',
                    }}>@{p.username}</div>
                    {p.displayName && p.displayName !== p.username && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--cream-muted)', fontStyle: 'italic' }}>
                        {p.displayName}
                      </div>
                    )}
                  </div>
                  <span style={{ color: 'var(--cream-muted)', fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>View →</span>
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
  textAlign: 'center', padding: '60px 20px',
  fontFamily: 'var(--font-cormorant, Georgia, serif)',
  color: 'var(--cream-muted)', fontSize: '1.05rem', letterSpacing: '0.05em',
  border: '1px solid var(--gold-border)', background: 'var(--bg-surface)',
};
