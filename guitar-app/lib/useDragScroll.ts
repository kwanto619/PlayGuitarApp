import { useRef, useCallback } from 'react';

// Click-and-drag horizontal panning for an overflow-x container. Lets the user
// drag long chord/lyric lines left/right with the mouse instead of hunting for
// the scrollbar (which sits at the bottom of a tall <pre>). Touch is left to
// native scrolling. Returns a ref + pointer handlers to spread on the element.
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const drag = useRef({ active: false, startX: 0, startLeft: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent<T>) => {
    if (e.pointerType === 'touch') return; // native touch scroll handles this
    const el = ref.current;
    if (!el) return;
    drag.current = { active: true, startX: e.clientX, startLeft: el.scrollLeft };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<T>) => {
    const el = ref.current;
    const d = drag.current;
    if (!el || !d.active) return;
    el.scrollLeft = d.startLeft - (e.clientX - d.startX);
  }, []);

  const stop = useCallback(() => { drag.current.active = false; }, []);

  return {
    ref,
    onPointerDown,
    onPointerMove,
    onPointerUp: stop,
    onPointerLeave: stop,
  };
}
