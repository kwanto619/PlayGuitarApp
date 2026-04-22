'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

const MOBILE_BREAKPOINT = 768;

export default function SmoothScroll() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let lenis: Lenis | null = null;
    let rafId = 0;

    const start = () => {
      if (lenis) return;
      lenis = new Lenis({
        duration: 1.05,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1,
      });
      const loop = (time: number) => {
        lenis?.raf(time);
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    };

    const stop = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      lenis?.destroy();
      lenis = null;
    };

    const mq = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px)`);
    const sync = () => (mq.matches ? start() : stop());
    sync();
    mq.addEventListener('change', sync);

    return () => {
      mq.removeEventListener('change', sync);
      stop();
    };
  }, []);

  return null;
}
