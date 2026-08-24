'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Song } from '@/types';
import { useRatings } from '@/lib/useRatings';
import Flag from './Flag';

/**
 * Compact song tile used in "Popular", "See also" and "Recently viewed"
 * strips. Shows title, artist, community rating and an optional rank badge.
 */
export default function MiniSongCard({ song, href, rank, meta }: {
  song: Song; href?: string; rank?: number; meta?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const { summaryOf } = useRatings();
  const s = summaryOf(song.id);

  return (
    <Link
      href={href ?? `/songs/${song.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', gap: '6px',
        textDecoration: 'none', minWidth: 0,
        background: 'var(--bg-card)',
        border: `1px solid ${hovered ? 'var(--gold-border-mid)' : 'var(--gold-border)'}`,
        padding: '14px 16px',
        boxShadow: hovered ? '0 8px 28px rgba(23,58,54,0.06)' : '0 2px 10px rgba(23,58,54,0.035)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
        position: 'relative',
      }}
    >
      {rank != null && (
        <span style={{
          position: 'absolute', top: '10px', right: '10px',
          minWidth: '26px', height: '26px', padding: '0 7px',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em',
          color: rank <= 3 ? '#fff' : 'var(--gold-bright)',
          background: rank <= 3 ? 'var(--gold)' : 'rgba(13,148,136,0.1)',
          border: '1px solid var(--gold-border-mid)', borderRadius: '6px',
        }}>
          #{rank}
        </span>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, paddingRight: rank != null ? '40px' : 0 }}>
        <Flag lang={song.language} style={{ width: '1.1em', height: '0.8em', flex: '0 0 auto' }} />
        <span style={{
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: '1.05rem', fontWeight: 600, letterSpacing: '0.02em',
          color: hovered ? 'var(--gold-bright)' : 'var(--cream)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          transition: 'color 0.15s',
        }}>
          {song.title}
        </span>
      </div>

      <span style={{
        fontFamily: 'var(--font-cormorant, Georgia, serif)',
        fontSize: '0.86rem', fontStyle: 'italic', color: 'var(--cream-muted)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {song.artist}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '2px' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--cream-soft)', whiteSpace: 'nowrap' }}>
          {s ? (
            <><span style={{ color: '#f5a623' }}>★</span> {s.avg.toFixed(1)} <span style={{ color: 'var(--cream-muted)' }}>({s.count})</span></>
          ) : (
            <span style={{ color: 'var(--cream-muted)', opacity: 0.7 }}>☆ —</span>
          )}
        </span>
        {meta && (
          <span style={{ fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-dim)', whiteSpace: 'nowrap' }}>
            {meta}
          </span>
        )}
      </div>
    </Link>
  );
}
