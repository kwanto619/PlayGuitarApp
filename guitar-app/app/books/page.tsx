'use client';

import Link from 'next/link';
import MusicBooksLibrary from '@/components/MusicBooksLibrary';
import AuthRequired from '@/components/AuthRequired';

export default function BooksPage() {
  return (
    <AuthRequired feature="Music Books">
      <div style={{ minHeight: '100vh' }}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-base) 100%)',
          borderBottom: '1px solid var(--gold-border)',
          padding: '0 clamp(20px, 4vw, 48px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px',
        }}>
          <Link href="/" style={topBtn}>← Home</Link>
          <span style={{
            fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '0.78rem',
            letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--cream-soft)',
          }}>
            ♪ Music Books
          </span>
        </div>

        <MusicBooksLibrary />
      </div>
    </AuthRequired>
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
