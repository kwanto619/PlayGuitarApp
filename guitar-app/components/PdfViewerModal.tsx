'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiX, FiZoomIn, FiZoomOut, FiChevronLeft, FiChevronRight, FiChevronDown, FiMaximize,
} from 'react-icons/fi';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { MusicBook } from '@/lib/books';

// pdf.js ships its worker as a separate module. Loading the library eagerly at
// module scope would pull it into the server bundle (it touches DOM globals),
// so both the lib and the worker URL are resolved lazily on first open.
let pdfjs: typeof import('pdfjs-dist') | null = null;
async function getPdfjs() {
  if (pdfjs) return pdfjs;
  const lib = await import('pdfjs-dist');
  lib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  pdfjs = lib;
  return lib;
}

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4];
const DEFAULT_ZOOM_INDEX = 2; // 1.0

interface Props {
  book: MusicBook | null;
  url: string | null;
  onClose: () => void;
}

export default function PdfViewerModal({ book, url, onClose }: Props) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [fitWidth, setFitWidth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // pdf.js throws if you start a second render on a canvas mid-flight, so we
  // keep the live task around and cancel it before each new one.
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const open = !!book && !!url;

  // ── Load the document ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !url) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPage(1);

    (async () => {
      try {
        const lib = await getPdfjs();
        const task = lib.getDocument({ url });
        const loaded = await task.promise;
        if (cancelled) { loaded.destroy(); return; }
        setDoc(loaded);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load PDF');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, url]);

  // Tear the document down on close so a big book doesn't sit in memory.
  useEffect(() => {
    if (open) return;
    setDoc((d) => { d?.destroy(); return null; });
    setZoomIndex(DEFAULT_ZOOM_INDEX);
    setFitWidth(true);
  }, [open]);

  // ── Render the current page ────────────────────────────────────────────
  const render = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!doc || !canvas) return;

    renderTaskRef.current?.cancel();

    const p = await doc.getPage(page);
    const base = p.getViewport({ scale: 1 });

    // "Fit width" is just a computed scale — it feeds the same viewport path
    // as the manual zoom steps rather than being a separate rendering mode.
    const avail = (scrollRef.current?.clientWidth ?? base.width) - 32;
    const scale = fitWidth ? avail / base.width : ZOOM_STEPS[zoomIndex];

    // Render at device resolution, then scale back down via CSS. Without this
    // the page is visibly soft on high-DPI screens, which matters for tabs.
    const dpr = window.devicePixelRatio || 1;
    const viewport = p.getViewport({ scale: scale * dpr });
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width / dpr}px`;
    canvas.style.height = `${viewport.height / dpr}px`;

    const task = p.render({ canvasContext: ctx, viewport });
    renderTaskRef.current = task;
    try {
      await task.promise;
    } catch {
      // Cancelled by a newer render (page flip / zoom) — expected, not an error.
    }
  }, [doc, page, zoomIndex, fitWidth]);

  useEffect(() => { void render(); }, [render]);

  // Re-fit on resize while in fit-width mode.
  useEffect(() => {
    if (!open || !fitWidth) return;
    const onResize = () => void render();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open, fitWidth, render]);

  // ── Controls ───────────────────────────────────────────────────────────
  const pageCount = doc?.numPages ?? 0;
  const goPrev = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const goNext = useCallback(
    () => setPage((p) => Math.min(pageCount || 1, p + 1)),
    [pageCount],
  );

  // Page picker — the page indicator opens a scrollable grid of page numbers.
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLSpanElement>(null);
  const currentCellRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { if (!open) setPickerOpen(false); }, [open]);

  // Close on click outside the picker
  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pickerOpen]);

  // Bring the current page into view when the picker opens
  useEffect(() => {
    if (pickerOpen) currentCellRef.current?.scrollIntoView({ block: 'center' });
  }, [pickerOpen]);

  // Leaving fit-width on zoom keeps the buttons meaningful — otherwise the
  // computed fit scale would immediately override whatever step you picked.
  const zoomIn = useCallback(() => {
    setFitWidth(false);
    setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1));
  }, []);
  const zoomOut = useCallback(() => {
    setFitWidth(false);
    setZoomIndex((i) => Math.max(0, i - 1));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Escape closes the page picker first, the reader second
        if (pickerOpen) setPickerOpen(false);
        else onClose();
      }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') goPrev();
      else if (e.key === 'ArrowRight' || e.key === 'PageDown') goNext();
      else if (e.key === '+' || e.key === '=') zoomIn();
      else if (e.key === '-') zoomOut();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, goPrev, goNext, zoomIn, zoomOut, pickerOpen]);

  // Freeze background scroll while the overlay owns the viewport.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const zoomLabel = fitWidth ? 'Fit' : `${Math.round(ZOOM_STEPS[zoomIndex] * 100)}%`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="pdf-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="pdf-shell"
            initial={{ scale: 0.97, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: 12 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="pdf-bar">
              <div className="pdf-title">
                <strong>{book?.title}</strong>
                {book?.author && <span className="pdf-author">{book.author}</span>}
              </div>

              <div className="pdf-controls">
                <button onClick={goPrev} disabled={page <= 1} aria-label="Previous page">
                  <FiChevronLeft size={18} />
                </button>
                <span className="pdf-page-wrap" ref={pickerRef}>
                  <button
                    className={`pdf-page-btn${pickerOpen ? ' active' : ''}`}
                    onClick={() => setPickerOpen((o) => !o)}
                    disabled={!pageCount}
                    aria-label="Go to page"
                    aria-expanded={pickerOpen}
                  >
                    <span className="pdf-page">{pageCount ? `${page} / ${pageCount}` : '—'}</span>
                    <FiChevronDown size={12} style={{ transition: 'transform 0.15s', transform: pickerOpen ? 'rotate(180deg)' : 'none' }} />
                  </button>

                  {pickerOpen && pageCount > 0 && (
                    <div className="pdf-page-picker" data-lenis-prevent>
                      <div className="pdf-page-picker-label">Jump to page</div>
                      <div className="pdf-page-grid">
                        {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                          <button
                            key={n}
                            ref={n === page ? currentCellRef : undefined}
                            className={`pdf-page-cell${n === page ? ' current' : ''}`}
                            onClick={() => { setPage(n); setPickerOpen(false); }}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </span>
                <button onClick={goNext} disabled={page >= pageCount} aria-label="Next page">
                  <FiChevronRight size={18} />
                </button>

                <div className="pdf-sep" />

                <button onClick={zoomOut} disabled={!fitWidth && zoomIndex === 0} aria-label="Zoom out">
                  <FiZoomOut size={18} />
                </button>
                <span className="pdf-zoom">{zoomLabel}</span>
                <button
                  onClick={zoomIn}
                  disabled={!fitWidth && zoomIndex === ZOOM_STEPS.length - 1}
                  aria-label="Zoom in"
                >
                  <FiZoomIn size={18} />
                </button>
                <button
                  onClick={() => setFitWidth(true)}
                  className={fitWidth ? 'active' : ''}
                  aria-label="Fit to width"
                >
                  <FiMaximize size={16} />
                </button>

                <div className="pdf-sep" />

                <button onClick={onClose} className="pdf-close" aria-label="Close">
                  <FiX size={18} />
                </button>
              </div>
            </header>

            {/* data-lenis-prevent: Lenis hijacks the wheel on desktop and drives
                window scroll, so without this the event never reaches this
                container and a zoomed page can't be panned. */}
            <div className="pdf-scroll" ref={scrollRef} data-lenis-prevent>
              {loading && <p className="pdf-msg">Loading book…</p>}
              {error && <p className="pdf-msg pdf-err">{error}</p>}
              <canvas ref={canvasRef} className="pdf-canvas" />
            </div>
          </motion.div>

          <style>{`
            .pdf-overlay {
              position: fixed; inset: 0; z-index: 100;
              background: rgba(0,0,0,0.82);
              backdrop-filter: blur(4px);
              display: flex; align-items: center; justify-content: center;
              padding: 24px;
            }
            .pdf-shell {
              width: min(1100px, 100%); height: min(92vh, 100%);
              display: flex; flex-direction: column;
              background: var(--bg-surface);
              border: 1px solid var(--gold-border);
              border-radius: 12px; overflow: hidden;
            }
            .pdf-bar {
              display: flex; align-items: center; justify-content: space-between;
              gap: 12px; padding: 10px 14px; flex-wrap: wrap;
              border-bottom: 1px solid var(--gold-border);
              background: rgba(0,0,0,0.3);
            }
            .pdf-title { display: flex; flex-direction: column; min-width: 0; }
            .pdf-title strong {
              color: var(--gold-bright); font-size: 0.95rem;
              white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .pdf-author { color: var(--cream); opacity: 0.6; font-size: 0.75rem; }
            .pdf-controls { display: flex; align-items: center; gap: 4px; }
            .pdf-controls button {
              display: inline-flex; align-items: center; justify-content: center;
              width: 32px; height: 32px; border-radius: 6px;
              background: transparent; color: var(--cream);
              border: 1px solid transparent; cursor: pointer;
            }
            .pdf-controls button:hover:not(:disabled) {
              background: rgba(255,255,255,0.08); border-color: var(--gold-border);
            }
            .pdf-controls button:disabled { opacity: 0.3; cursor: default; }
            .pdf-controls button.active {
              color: var(--gold-bright); border-color: var(--gold-border);
            }
            .pdf-close:hover { color: #ff6b6b; }
            .pdf-page, .pdf-zoom {
              font-size: 0.78rem; color: var(--cream); opacity: 0.75;
              min-width: 54px; text-align: center; font-variant-numeric: tabular-nums;
            }
            .pdf-page-wrap { position: relative; display: inline-flex; }
            .pdf-controls .pdf-page-btn {
              width: auto; height: 32px; padding: 0 8px; gap: 5px;
              border: 1px solid transparent;
            }
            .pdf-controls .pdf-page-btn .pdf-page { min-width: 0; }
            .pdf-page-picker {
              position: absolute; top: calc(100% + 10px); left: 50%;
              transform: translateX(-50%);
              width: min(276px, calc(100vw - 24px));
              max-height: min(320px, 55vh);
              overflow-y: auto; overscroll-behavior: contain;
              background: var(--bg-surface);
              border: 1px solid var(--gold-border);
              border-radius: 10px; padding: 10px;
              box-shadow: 0 18px 48px rgba(0,0,0,0.65);
              z-index: 30;
            }
            .pdf-page-picker-label {
              font-size: 0.6rem; letter-spacing: 0.3em; text-transform: uppercase;
              color: var(--cream); opacity: 0.45; text-align: center;
              padding: 2px 0 10px;
            }
            .pdf-page-grid {
              display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px;
            }
            .pdf-controls .pdf-page-cell {
              width: auto; height: 34px; border-radius: 6px;
              font-size: 0.75rem; font-variant-numeric: tabular-nums;
              color: var(--cream); opacity: 0.8;
            }
            .pdf-controls .pdf-page-cell:hover {
              opacity: 1; background: rgba(0,196,180,0.12);
              border-color: var(--gold-border);
            }
            .pdf-controls .pdf-page-cell.current {
              opacity: 1; color: var(--gold-bright);
              background: rgba(0,196,180,0.16);
              border-color: var(--gold-border);
            }
            .pdf-sep {
              width: 1px; height: 20px; margin: 0 6px;
              background: var(--gold-border);
            }
            .pdf-scroll {
              flex: 1; overflow: auto; padding: 16px;
              display: flex; justify-content: center; align-items: flex-start;
              background: var(--bg-deep);
            }
            .pdf-canvas {
              display: block; border-radius: 4px;
              box-shadow: 0 8px 32px rgba(0,0,0,0.5);
              background: #fff;
            }
            .pdf-msg {
              color: var(--cream); opacity: 0.7; padding: 40px;
              font-size: 0.9rem;
            }
            .pdf-err { color: #ff6b6b; opacity: 1; }
            @media (max-width: 900px) {
              .pdf-overlay { padding: 0; }
              .pdf-shell { height: 100%; border-radius: 0; border: none; }
              .pdf-bar { padding: 8px 10px; }
              .pdf-title { flex: 1 1 100%; order: -1; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
