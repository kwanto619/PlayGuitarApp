'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Auth from '@/components/Auth';
import { useAuth } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [user, loading, router]);

  if (loading || user) return null;
  return <Auth initialMode="signup" />;
}
