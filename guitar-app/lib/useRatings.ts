'use client';

import { useCallback, useEffect, useState } from 'react';
import type { RatingSummary } from '@/types';
import { loadMyRatings, loadRatingSummary, rateSong } from './storage';
import { useAuth } from './auth';

// Module-level cache so every page that shows stars (library, song, top,
// home) shares one fetch and sees the same optimistic updates.
let summaryCache: Record<string, RatingSummary> | null = null;
let mineCache: Record<string, number> | null = null;
let mineCacheUser: string | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

async function ensureLoaded(userId: string | null, force = false) {
  const needMine = userId !== mineCacheUser || mineCache === null;
  if (!force && summaryCache && !needMine) return;
  if (inflight && !force) return inflight;
  inflight = (async () => {
    const [summary, mine] = await Promise.all([
      loadRatingSummary(),
      userId ? loadMyRatings() : Promise.resolve({}),
    ]);
    summaryCache = summary;
    mineCache = mine;
    mineCacheUser = userId;
    notify();
  })().finally(() => { inflight = null; });
  return inflight;
}

export interface RatingsApi {
  /** Community average + count for a song (undefined if unrated). */
  summaryOf: (songId: string) => RatingSummary | undefined;
  /** The signed-in member's own stars for a song. */
  mine: (songId: string) => number | undefined;
  /** Set stars (1–5) or clear (same star twice) — optimistic. */
  rate: (songId: string, stars: number) => Promise<void>;
  loaded: boolean;
}

export function useRatings(): RatingsApi {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [, bump] = useState(0);

  useEffect(() => {
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    ensureLoaded(uid);
    return () => { listeners.delete(l); };
  }, [uid]);

  const rate = useCallback(async (songId: string, stars: number) => {
    if (!uid) throw new Error('Sign in to rate songs.');
    const prevMine = mineCache?.[songId];
    const next = prevMine === stars ? null : stars;

    // Optimistic recompute of the average.
    const s = summaryCache?.[songId];
    const oldSum = s ? s.avg * s.count : 0;
    const oldCount = s?.count ?? 0;
    let sum = oldSum - (prevMine ?? 0);
    let count = oldCount - (prevMine ? 1 : 0);
    if (next) { sum += next; count += 1; }
    summaryCache = { ...(summaryCache ?? {}) };
    if (count > 0) summaryCache[songId] = { avg: Math.round((sum / count) * 10) / 10, count };
    else delete summaryCache[songId];
    mineCache = { ...(mineCache ?? {}) };
    if (next) mineCache[songId] = next; else delete mineCache[songId];
    notify();

    try {
      await rateSong(songId, next);
    } catch (e) {
      await ensureLoaded(uid, true); // roll back to server truth
      throw e;
    }
  }, [uid]);

  return {
    summaryOf: (id) => summaryCache?.[id],
    mine: (id) => mineCache?.[id],
    rate,
    loaded: summaryCache !== null,
  };
}
