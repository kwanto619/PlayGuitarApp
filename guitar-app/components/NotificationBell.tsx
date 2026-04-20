'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { countUnreadNotifications, loadNotifications, markAllNotificationsRead } from '@/lib/storage';
import type { Notification } from '@/types';

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)     return `${Math.floor(s)}s`;
  if (s < 3600)   return `${Math.floor(s / 60)}m`;
  if (s < 86400)  return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [open,   setOpen]   = useState(false);
  const [items,  setItems]  = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    countUnreadNotifications().then(setUnread);
    const h = setInterval(() => { countUnreadNotifications().then(setUnread); }, 30000);
    return () => clearInterval(h);
  }, [user]);

  useEffect(() => {
    if (!open) return;
    loadNotifications(20).then(setItems);
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await markAllNotificationsRead();
      setUnread(0);
    }
  };

  if (!user) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={toggle}
        style={{
          padding: '8px 12px', cursor: 'pointer',
          border: '1px solid var(--gold-border-mid)',
          background: 'transparent', color: 'var(--gold-bright)',
          fontSize: '1rem', lineHeight: 1,
          position: 'relative',
        }}
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '-6px', right: '-6px',
            background: '#ff5577', color: '#fff',
            fontSize: '0.6rem', fontWeight: 700,
            minWidth: '16px', height: '16px', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: '320px', maxHeight: '420px', overflowY: 'auto',
          background: 'var(--bg-surface)',
          border: '1px solid var(--gold-border-mid)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          zIndex: 50,
        }}>
          <div style={{
            padding: '10px 14px',
            borderBottom: '1px solid var(--gold-border)',
            fontSize: '0.62rem', letterSpacing: '0.3em', textTransform: 'uppercase',
            color: 'var(--gold-dim)', fontFamily: 'var(--font-cormorant, Georgia, serif)',
          }}>
            Notifications
          </div>
          {items.length === 0 ? (
            <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--cream-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
              No notifications yet
            </div>
          ) : (
            items.map((n) => (
              <Link
                key={n.id}
                href={n.actorUsername ? `/u/${n.actorUsername}` : '#'}
                onClick={() => setOpen(false)}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--gold-border)',
                  background: n.readAt ? 'transparent' : 'rgba(0,196,180,0.05)',
                  display: 'flex', flexDirection: 'column', gap: '2px',
                }}>
                  <div style={{ fontSize: '0.92rem', color: 'var(--cream-soft)', fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>
                    {n.type === 'follow' ? (
                      <><strong style={{ color: 'var(--gold-bright)' }}>@{n.actorUsername ?? 'someone'}</strong> started following you</>
                    ) : (
                      <>New activity from @{n.actorUsername ?? 'someone'}</>
                    )}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--cream-muted)', letterSpacing: '0.1em' }}>
                    {timeAgo(n.createdAt)}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
