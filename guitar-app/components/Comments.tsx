'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { addComment, deleteComment, loadComments } from '@/lib/storage';
import type { Comment } from '@/types';

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return `${Math.floor(s)}s`;
  if (s < 3600)  return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}

export default function Comments({ songId }: { songId: string }) {
  const { user } = useAuth();
  const [list,    setList]    = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft,   setDraft]   = useState('');
  const [posting, setPosting] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setList(await loadComments(songId));
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [songId]); // eslint-disable-line react-hooks/exhaustive-deps

  const post = async () => {
    if (!draft.trim() || posting) return;
    setPosting(true);
    try {
      await addComment(songId, draft);
      setDraft('');
      await refresh();
    } catch (e) { alert((e as Error).message); }
    setPosting(false);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this comment?')) return;
    try { await deleteComment(id); await refresh(); } catch { /* silent */ }
  };

  return (
    <section style={{ marginTop: '48px' }}>
      <div style={{
        fontSize: '0.6rem', letterSpacing: '0.45em', textTransform: 'uppercase',
        color: 'var(--gold-dim)', fontFamily: 'var(--font-cormorant, Georgia, serif)',
        marginBottom: '12px',
      }}>
        Comments {list.length > 0 && `(${list.length})`}
      </div>

      {/* Compose */}
      {user && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a comment…"
            rows={2}
            style={{
              flex: 1, padding: '10px 14px',
              fontFamily: 'var(--font-cormorant, Georgia, serif)',
              fontSize: '0.95rem',
              background: 'var(--bg-input)',
              border: '1px solid var(--gold-border-mid)',
              color: 'var(--cream)', outline: 'none', resize: 'vertical',
            }}
          />
          <button
            onClick={post} disabled={!draft.trim() || posting}
            style={{
              padding: '0 18px', alignSelf: 'stretch',
              fontFamily: 'var(--font-cormorant, Georgia, serif)',
              fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.2em',
              textTransform: 'uppercase', cursor: posting ? 'wait' : 'pointer',
              border: '1px solid var(--gold-border-mid)',
              background: 'linear-gradient(135deg, rgba(0,130,120,0.55), rgba(0,90,83,0.35))',
              color: 'var(--gold-bright)',
              opacity: !draft.trim() ? 0.5 : 1,
            }}
          >
            {posting ? '…' : 'Post'}
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ fontSize: '0.9rem', color: 'var(--cream-muted)', fontStyle: 'italic' }}>Loading…</div>
      ) : list.length === 0 ? (
        <div style={{ fontSize: '0.95rem', color: 'var(--cream-muted)', fontStyle: 'italic', fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>
          No comments yet. {user ? 'Be the first.' : 'Sign in to post.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {list.map((c) => (
            <div key={c.id} style={{
              padding: '12px 14px',
              border: '1px solid var(--gold-border)',
              background: 'var(--bg-card)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <Link href={`/u/${c.username}`} style={{
                    fontFamily: 'var(--font-cormorant, Georgia, serif)',
                    fontSize: '0.92rem', fontWeight: 600, color: 'var(--gold-bright)',
                    textDecoration: 'none', letterSpacing: '0.04em',
                  }}>
                    @{c.username}
                  </Link>
                  <span style={{ fontSize: '0.7rem', color: 'var(--cream-muted)', letterSpacing: '0.1em' }}>
                    {timeAgo(c.createdAt)}
                  </span>
                </div>
                {user?.id === c.userId && (
                  <button
                    onClick={() => remove(c.id)}
                    style={{
                      padding: '2px 8px', background: 'transparent',
                      border: '1px solid transparent', color: 'var(--cream-muted)',
                      cursor: 'pointer', fontSize: '0.75rem',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red-tuning)'; e.currentTarget.style.borderColor = 'rgba(224,72,72,0.3)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cream-muted)'; e.currentTarget.style.borderColor = 'transparent'; }}
                  >
                    Delete
                  </button>
                )}
              </div>
              <div style={{
                fontFamily: 'var(--font-cormorant, Georgia, serif)',
                fontSize: '1rem', color: 'var(--cream-soft)', lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
              }}>
                {c.body}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
