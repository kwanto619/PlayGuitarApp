'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useRatings } from '@/lib/useRatings';

/**
 * Community star rating.
 *  - Everyone sees the average + vote count ("4.8 (12)").
 *  - Members click to set their own stars (click again to clear).
 *  - Visitors get a "Sign in to rate" link instead of interactive stars.
 */
export default function RatingStars({ songId, size = 'md', showSignIn = true }: {
  songId: string; size?: 'sm' | 'md' | 'lg'; showSignIn?: boolean;
}) {
  const { user } = useAuth();
  const { summaryOf, mine, rate } = useRatings();
  const [hovered, setHovered] = useState(0);
  const [busy, setBusy] = useState(false);

  const summary = summaryOf(songId);
  const my = mine(songId);
  const starPx = size === 'lg' ? '1.5rem' : size === 'sm' ? '0.95rem' : '1.15rem';
  const interactive = !!user;

  // Filled stars: hover preview → my rating → community average.
  const shown = hovered || my || Math.round(summary?.avg ?? 0);

  const onPick = async (star: number) => {
    if (!interactive || busy) return;
    setBusy(true);
    try { await rate(songId, star); } catch { /* rolled back inside hook */ }
    setBusy(false);
  };

  return (
    <div
      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        role={interactive ? 'radiogroup' : undefined}
        aria-label="Rating"
        style={{ display: 'inline-flex', gap: '2px' }}
        onMouseLeave={() => setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= shown;
          return (
            <span
              key={star}
              onMouseEnter={() => interactive && setHovered(star)}
              onClick={() => onPick(star)}
              title={interactive ? (my === star ? 'Remove your rating' : `Rate ${star} star${star > 1 ? 's' : ''}`) : undefined}
              style={{
                fontSize: starPx, lineHeight: 1, userSelect: 'none',
                cursor: interactive ? 'pointer' : 'default',
                color: filled ? '#f5a623' : 'var(--cream-muted)',
                opacity: filled ? 1 : 0.3,
                transition: 'color 0.1s, opacity 0.1s',
              }}
            >
              ★
            </span>
          );
        })}
      </div>

      <span style={{
        fontFamily: 'var(--font-cormorant, Georgia, serif)',
        fontSize: size === 'lg' ? '0.95rem' : '0.78rem',
        color: 'var(--cream-soft)', letterSpacing: '0.04em', whiteSpace: 'nowrap',
      }}>
        {summary ? (
          <>
            <strong style={{ color: 'var(--cream)' }}>{summary.avg.toFixed(1)}</strong>
            <span style={{ color: 'var(--cream-muted)' }}> ({summary.count})</span>
          </>
        ) : (
          <span style={{ color: 'var(--cream-muted)' }}>Not rated yet</span>
        )}
      </span>

      {!user && showSignIn && (
        <Link href="/login" style={{
          fontSize: '0.74rem', letterSpacing: '0.06em', color: 'var(--gold-bright)',
          fontFamily: 'var(--font-cormorant, Georgia, serif)', textDecoration: 'underline',
          textUnderlineOffset: '3px', whiteSpace: 'nowrap',
        }}>
          Sign in to rate
        </Link>
      )}
      {user && my && (
        <span style={{ fontSize: '0.7rem', color: 'var(--gold-dim)', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
          you: {my}★
        </span>
      )}
    </div>
  );
}
