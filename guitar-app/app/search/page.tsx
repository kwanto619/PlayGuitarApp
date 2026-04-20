'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Profile } from '@/types';
import { searchProfiles } from '@/lib/storage';

export default function SearchPage() {
  const [q,    setQ]    = useState('');
  const [list, setList] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (!term) { setList([]); return; }
    setLoading(true);
    const h = setTimeout(async () => {
      setList(await searchProfiles(term));
      setLoading(false);
    }, 200);
    return () => clearTimeout(h);
  }, [q]);

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
          ⌕ Find Members
        </span>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: 'clamp(32px, 5vw, 64px) clamp(16px, 4vw, 48px)' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by username…"
          autoFocus
          style={{
            width: '100%', padding: '14px 18px',
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: '1.1rem',
            background: 'var(--bg-input)',
            border: '1px solid var(--gold-border-mid)',
            color: 'var(--cream)', outline: 'none', boxSizing: 'border-box',
            marginBottom: '24px',
          }}
        />

        {loading && <div style={{ color: 'var(--cream-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>Searching…</div>}

        {!loading && q.trim() && list.length === 0 && (
          <div style={{ color: 'var(--cream-muted)', fontStyle: 'italic', fontSize: '1rem', fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>
            No members match &ldquo;{q}&rdquo;.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {list.map((p) => (
            <Link key={p.id} href={`/u/${p.username}`} style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '14px 18px',
                border: '1px solid var(--gold-border)',
                background: 'var(--bg-card)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-cormorant, Georgia, serif)',
                    fontSize: '1.05rem', fontWeight: 600, color: 'var(--gold-bright)',
                  }}>
                    @{p.username}
                  </div>
                  {p.displayName && p.displayName !== p.username && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--cream-muted)', fontStyle: 'italic' }}>
                      {p.displayName}
                    </div>
                  )}
                </div>
                <span style={{ color: 'var(--cream-muted)', fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  View →
                </span>
              </div>
            </Link>
          ))}
        </div>
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
