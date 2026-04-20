'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toggleFavorite } from '@/lib/storage';

export default function FavoriteButton({ songId, size = 'md' }: { songId: string; size?: 'sm' | 'md' }) {
  const [faved, setFaved] = useState<boolean | null>(null);
  const [busy,  setBusy]  = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setFaved(false); return; }
      const { data } = await supabase.from('favorites').select('song_id').eq('user_id', u.user.id).eq('song_id', songId).maybeSingle();
      setFaved(!!data);
    })();
  }, [songId]);

  const handle = async (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const now = await toggleFavorite(songId);
      setFaved(now);
    } catch { /* silent */ }
    setBusy(false);
  };

  const fontSize = size === 'sm' ? '1.1rem' : '1.5rem';
  const pad      = size === 'sm' ? '4px 8px' : '8px 14px';

  return (
    <button
      onClick={handle}
      title={faved ? 'Remove from favorites' : 'Add to favorites'}
      style={{
        padding: pad, background: 'transparent', border: 'none', cursor: 'pointer',
        color: faved ? '#ff5577' : 'var(--cream-muted)',
        fontSize, lineHeight: 1, transition: 'color 0.15s, transform 0.1s',
        opacity: faved === null ? 0.4 : 1,
      }}
      onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.85)'; }}
      onMouseUp={(e)   => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {faved ? '♥' : '♡'}
    </button>
  );
}
