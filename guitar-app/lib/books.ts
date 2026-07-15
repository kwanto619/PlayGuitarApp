import { supabase } from './supabase';

// Private PDF shelf. Every read goes through a signed URL minted on demand —
// the bucket is private, so a raw object URL is useless without one. RLS on
// storage.objects pins each object to the <uid>/ prefix it lives under, which
// means the signing call itself fails for anyone but the owner.

export interface MusicBook {
  id: string;
  title: string;
  author?: string;
  storagePath: string;
  pageCount?: number;
  coverDataUrl?: string;
  createdAt?: string;
}

type BookRow = {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  storage_path: string;
  page_count: number | null;
  cover_data_url: string | null;
  created_at: string | null;
};

function mapBook(b: BookRow): MusicBook {
  return {
    id: b.id,
    title: b.title,
    author: b.author || undefined,
    storagePath: b.storage_path,
    pageCount: b.page_count ?? undefined,
    coverDataUrl: b.cover_data_url || undefined,
    createdAt: b.created_at ?? undefined,
  };
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

/** Books owned by the signed-in user. Empty when signed out. */
export const loadBooks = async (): Promise<MusicBook[]> => {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data, error } = await supabase
    .from('music_books')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  if (error) { console.error('loadBooks:', error); return []; }
  return (data as BookRow[]).map(mapBook);
};

// Signed URLs are short-lived so a leaked link (history, logs, a shared
// screen) stops working quickly. Long enough to read a chapter, not a day.
const SIGNED_URL_TTL = 60 * 60; // seconds

/**
 * Mint a signed URL for a book's PDF. Fails for any path the caller doesn't
 * own — the storage policy checks the uid prefix, not just this query.
 */
export const getBookUrl = async (storagePath: string): Promise<string | null> => {
  const { data, error } = await supabase.storage
    .from('music-books')
    .createSignedUrl(storagePath, SIGNED_URL_TTL);
  if (error || !data) { console.error('getBookUrl:', error); return null; }
  return data.signedUrl;
};

/** Upload a PDF to the caller's own prefix and register it in the catalogue. */
export const addBook = async (
  file: File,
  meta: { title: string; author?: string; coverDataUrl?: string },
): Promise<MusicBook[]> => {
  const uid = await currentUserId();
  if (!uid) throw new Error('Not signed in');

  // crypto.randomUUID avoids leaking the original filename into the path.
  const path = `${uid}/${crypto.randomUUID()}.pdf`;
  const { error: upErr } = await supabase.storage
    .from('music-books')
    .upload(path, file, { contentType: 'application/pdf', upsert: false });
  if (upErr) { console.error('addBook upload:', upErr); throw new Error(upErr.message); }

  const { error } = await supabase.from('music_books').insert({
    user_id: uid,
    title: meta.title,
    author: meta.author || null,
    storage_path: path,
    cover_data_url: meta.coverDataUrl || null,
  });
  if (error) {
    // Roll back the object so a failed insert doesn't strand bytes we can no
    // longer see from the catalogue.
    await supabase.storage.from('music-books').remove([path]);
    console.error('addBook insert:', error);
    throw new Error(error.message);
  }
  return loadBooks();
};

export const deleteBook = async (book: MusicBook): Promise<MusicBook[]> => {
  const { error } = await supabase.from('music_books').delete().eq('id', book.id);
  if (error) throw new Error(error.message);
  await supabase.storage.from('music-books').remove([book.storagePath]);
  return loadBooks();
};
