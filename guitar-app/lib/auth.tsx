'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthCtx {
  user: User | null;
  session: Session | null;
  username: string | null;
  avatarUrl: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  setAvatar: (dataUrl: string | null) => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null, session: null, username: null, avatarUrl: null, loading: true,
  signOut: async () => {},
  setAvatar: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const user = session?.user ?? null;
  const username = (user?.user_metadata?.username as string | undefined) ?? null;
  const avatarUrl = (user?.user_metadata?.avatar_url as string | undefined) ?? null;

  const signOut = async () => { await supabase.auth.signOut(); };

  const setAvatar = async (dataUrl: string | null) => {
    const { data, error } = await supabase.auth.updateUser({ data: { avatar_url: dataUrl } });
    if (error) throw error;
    if (data.user) {
      setSession((s) => (s ? { ...s, user: data.user! } : s));
    }
  };

  return (
    <Ctx.Provider value={{ user, session, username, avatarUrl, loading, signOut, setAvatar }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() { return useContext(Ctx); }
