// Per-song "how often do I open this" tracker, stored in localStorage.
//
// This powers the "Most watched" sort. We keep it client-local instead of a DB
// column on purpose: it's a personal usage signal (songs *you* reach for), it
// needs no migration, and — importantly — RLS blocks incrementing a counter on
// a public song you don't own, which would make a DB counter fail silently for
// exactly the songs you play most.
const KEY = 'songcord:playcounts';

export type PlayCounts = Record<string, number>;

export function getPlayCounts(): PlayCounts {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PlayCounts) : {};
  } catch {
    return {};
  }
}

/** Increment a song's open count. Returns the new counts map. */
export function bumpPlayCount(id: string): PlayCounts {
  if (typeof window === 'undefined') return {};
  const counts = getPlayCounts();
  counts[id] = (counts[id] || 0) + 1;
  try {
    localStorage.setItem(KEY, JSON.stringify(counts));
  } catch {
    /* quota / private-mode — non-fatal */
  }
  return counts;
}
