'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Shared auto-scroll engine (rAF-based). Scrolls `target` when given, else the
 * window. Stops automatically at the bottom. Used by the bottom song toolbar
 * (window) and the fullscreen lyrics overlay (its own scroll container).
 */
export function useAutoScroll(target?: React.RefObject<HTMLElement | null>) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const speedRef = useRef(speed);
  const accumRef = useRef(0); // fractional pixel accumulator
  const rafRef = useRef<number | null>(null);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  const step = useCallback(() => {
    accumRef.current += speedRef.current * 0.6;
    const px = Math.floor(accumRef.current);
    if (px > 0) {
      accumRef.current -= px;
      const el = target?.current;
      let atEnd: boolean;
      if (el) {
        el.scrollBy(0, px);
        atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
      } else {
        window.scrollBy(0, px);
        atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      }
      if (atEnd) { setPlaying(false); return; }
    }
    rafRef.current = requestAnimationFrame(step);
  }, [target]);

  useEffect(() => {
    if (playing) {
      accumRef.current = 0;
      rafRef.current = requestAnimationFrame(step);
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, step]);

  const faster = useCallback(() => setSpeed((s) => Math.min(5, +(s + 0.1).toFixed(1))), []);
  const slower = useCallback(() => setSpeed((s) => Math.max(0.1, +(s - 0.1).toFixed(1))), []);

  return { playing, setPlaying, speed, faster, slower };
}
