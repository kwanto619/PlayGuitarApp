'use client';

import { useEffect, useState, useRef } from 'react';
import { FiBook, FiUploadCloud, FiTrash2, FiLock } from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import { loadBooks, getBookUrl, addBook, deleteBook, type MusicBook } from '@/lib/books';
import PdfViewerModal from './PdfViewerModal';

export default function MusicBooksLibrary() {
  const { user, loading: authLoading } = useAuth();
  const [books, setBooks] = useState<MusicBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [active, setActive] = useState<MusicBook | null>(null);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setBooks([]); setLoading(false); return; }
    loadBooks().then((b) => { setBooks(b); setLoading(false); });
  }, [user, authLoading]);

  // The signed URL is minted per-open rather than alongside the list, so a
  // book you never open never produces a fetchable link.
  const openBook = async (book: MusicBook) => {
    setError(null);
    const url = await getBookUrl(book.storagePath);
    if (!url) { setError('Could not open this book.'); return; }
    setActive(book);
    setActiveUrl(url);
  };

  const closeBook = () => { setActive(null); setActiveUrl(null); };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the same file be re-picked after an error
    if (!file) return;
    if (file.type !== 'application/pdf') { setError('PDFs only.'); return; }

    setBusy(true);
    setError(null);
    try {
      const title = file.name.replace(/\.pdf$/i, '');
      setBooks(await addBook(file, { title }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (book: MusicBook, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Remove "${book.title}" from your shelf?`)) return;
    try {
      setBooks(await deleteBook(book));
    } catch {
      setError('Could not delete that book.');
    }
  };

  if (authLoading || loading) {
    return <p className="mb-msg">Loading…</p>;
  }

  if (!user) {
    return <p className="mb-msg">Sign in to see your books.</p>;
  }

  return (
    <div className="mb-wrap">
      <header className="mb-head">
        <div>
          <h1 className="mb-h1">Music Books</h1>
          <p className="mb-sub">
            <FiLock size={12} /> Private to your account — nobody else can open these.
          </p>
        </div>
        <button className="mb-upload" onClick={() => fileRef.current?.click()} disabled={busy}>
          <FiUploadCloud size={16} /> {busy ? 'Uploading…' : 'Add PDF'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          onChange={onPick}
          style={{ display: 'none' }}
        />
      </header>

      {error && <p className="mb-err">{error}</p>}

      {books.length === 0 ? (
        <div className="mb-empty">
          <FiBook size={32} />
          <p>Your shelf is empty. Add a PDF to get started.</p>
        </div>
      ) : (
        <div className="mb-grid">
          {books.map((b) => (
            <button key={b.id} className="mb-card" onClick={() => openBook(b)}>
              <div className="mb-cover">
                {b.coverDataUrl
                  ? <img src={b.coverDataUrl} alt="" />
                  : <FiBook size={28} />}
              </div>
              <div className="mb-meta">
                <strong>{b.title}</strong>
                {b.author && <span>{b.author}</span>}
              </div>
              <span
                className="mb-del"
                role="button"
                tabIndex={0}
                aria-label={`Delete ${b.title}`}
                onClick={(e) => onDelete(b, e)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onDelete(b, e as unknown as React.MouseEvent);
                  }
                }}
              >
                <FiTrash2 size={14} />
              </span>
            </button>
          ))}
        </div>
      )}

      <PdfViewerModal book={active} url={activeUrl} onClose={closeBook} />

      <style>{`
        .mb-wrap { padding: 32px 28px 60px; max-width: 1100px; margin: 0 auto; }
        .mb-msg { padding: 40px 28px; color: var(--cream); opacity: 0.7; }
        .mb-head {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 16px; flex-wrap: wrap; margin-bottom: 28px;
        }
        .mb-h1 {
          font-family: var(--font-cormorant, Georgia, serif);
          font-size: 1.9rem; color: var(--gold-bright); margin: 0 0 6px;
          letter-spacing: 0.02em;
        }
        .mb-sub {
          display: inline-flex; align-items: center; gap: 6px;
          margin: 0; font-size: 0.78rem; color: var(--cream); opacity: 0.55;
        }
        .mb-upload {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 9px 16px; border-radius: 8px; cursor: pointer;
          background: transparent; color: var(--gold-bright);
          border: 1px solid var(--gold-border); font-size: 0.85rem;
        }
        .mb-upload:hover:not(:disabled) { background: rgba(255,255,255,0.06); }
        .mb-upload:disabled { opacity: 0.5; cursor: default; }
        .mb-err {
          color: #ff6b6b; font-size: 0.82rem; margin: 0 0 16px;
        }
        .mb-empty {
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          padding: 64px 20px; color: var(--cream); opacity: 0.45;
          border: 1px dashed var(--gold-border); border-radius: 12px;
        }
        .mb-empty p { margin: 0; font-size: 0.88rem; }
        .mb-grid {
          display: grid; gap: 18px;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        }
        .mb-card {
          position: relative; text-align: left; cursor: pointer;
          display: flex; flex-direction: column; gap: 10px; padding: 0;
          background: transparent; border: none; color: inherit;
        }
        .mb-cover {
          aspect-ratio: 3 / 4; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(160deg, var(--bg-surface), var(--bg-base));
          border: 1px solid var(--gold-border);
          color: var(--gold-bright); overflow: hidden;
          transition: transform 0.18s ease, border-color 0.18s ease;
        }
        .mb-card:hover .mb-cover {
          transform: translateY(-3px); border-color: var(--gold-bright);
        }
        .mb-cover img { width: 100%; height: 100%; object-fit: cover; }
        .mb-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .mb-meta strong {
          font-size: 0.85rem; color: var(--cream);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .mb-meta span { font-size: 0.72rem; color: var(--cream); opacity: 0.5; }
        .mb-del {
          position: absolute; top: 8px; right: 8px;
          display: inline-flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: 6px;
          background: rgba(0,0,0,0.6); color: var(--cream);
          opacity: 0; transition: opacity 0.15s ease;
        }
        .mb-card:hover .mb-del { opacity: 1; }
        .mb-del:hover { color: #ff6b6b; }
        @media (max-width: 900px) {
          .mb-wrap { padding: 20px 16px 48px; }
          .mb-del { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
