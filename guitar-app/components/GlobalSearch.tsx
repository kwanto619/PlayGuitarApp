'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiSearch } from 'react-icons/fi';

export default function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const term = q.trim();
    if (!term) { router.push('/search'); return; }
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <form onSubmit={submit} className="global-search" role="search">
      <FiSearch size={15} className="gs-icon" aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Find members…"
        aria-label="Find members"
      />
      <style>{`
        .global-search {
          position: fixed;
          top: 10px;
          right: 12px;
          z-index: 25;
          display: flex; align-items: center; gap: 8px;
          padding: 6px 12px;
          border: 1px solid ${focused ? 'var(--gold-bright)' : 'var(--gold-border-mid)'};
          background: rgba(8,14,15,0.92);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: var(--cream);
          transition: border-color 0.18s, box-shadow 0.18s;
          box-shadow: ${focused ? '0 0 18px rgba(0,232,213,0.25)' : '0 2px 10px rgba(0,0,0,0.5)'};
        }
        .global-search .gs-icon { color: var(--gold-bright); flex-shrink: 0; }
        .global-search input {
          width: 220px;
          background: transparent;
          border: none;
          outline: none;
          color: var(--cream);
          font-family: var(--font-cormorant, Georgia, serif);
          font-size: 0.92rem;
          font-weight: 500;
          letter-spacing: 0.05em;
        }
        .global-search input::placeholder {
          color: var(--cream-soft);
          opacity: 1;
          font-weight: 500;
          letter-spacing: 0.08em;
        }
        @media (max-width: 900px) {
          .global-search { right: 10px; top: 14px; padding: 5px 10px; }
          .global-search input { width: 140px; font-size: 0.8rem; }
        }
        @media (max-width: 520px) {
          .global-search input { width: 110px; }
        }
      `}</style>
    </form>
  );
}
