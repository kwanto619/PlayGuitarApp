import { Song, Playlist, Progression, Profile, Comment } from '@/types';
import { supabase } from './supabase';

// ── Helpers ───────────────────────────────────────────────────────────────────
async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

type SongRow = {
  id: string; title: string; artist: string;
  chords: string[]; lyrics: string | null; notes: string | null;
  language: string; bpm: number | null; rating: number | null;
  youtube_video_id: string | null;
  user_id: string | null;
  created_at?: string | null;
  profiles?: { username: string | null } | null;
};

function mapSong(s: SongRow): Song {
  return {
    id: s.id, title: s.title, artist: s.artist,
    chords: s.chords,
    lyrics: s.lyrics || undefined,
    notes: s.notes || undefined,
    language: s.language as 'greek' | 'english',
    bpm: s.bpm ?? undefined,
    rating: s.rating ?? undefined,
    youtubeVideoId: s.youtube_video_id || undefined,
    userId: s.user_id ?? undefined,
    uploaderUsername: s.profiles?.username ?? undefined,
    createdAt: s.created_at ?? undefined,
  };
}

// ── Songs ─────────────────────────────────────────────────────────────────────
const SONG_SELECT = '*, profiles:user_id(username)';

export const loadSongs = async (): Promise<Song[]> => {
  const uid = await currentUserId();
  let q = supabase.from('songs').select(SONG_SELECT).order('created_at', { ascending: false });
  if (uid) q = q.eq('user_id', uid);
  const { data, error } = await q;
  if (error) { console.error('loadSongs:', error); return []; }
  return (data as SongRow[]).map(mapSong);
};

export const loadAllPublicSongs = async (): Promise<Song[]> => {
  const { data, error } = await supabase.from('songs').select(SONG_SELECT).eq('is_public', true).order('created_at', { ascending: false });
  if (error) { console.error('loadAllPublicSongs:', error); return []; }
  return (data as SongRow[]).map(mapSong);
};

export const loadSongsByUser = async (userId: string): Promise<Song[]> => {
  const { data, error } = await supabase.from('songs').select(SONG_SELECT).eq('user_id', userId).order('created_at', { ascending: false });
  if (error) { console.error('loadSongsByUser:', error); return []; }
  return (data as SongRow[]).map(mapSong);
};

export const loadSongById = async (id: string): Promise<Song | null> => {
  const { data, error } = await supabase.from('songs').select(SONG_SELECT).eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapSong(data as SongRow);
};

export const addSong = async (song: Omit<Song, 'id'>): Promise<Song[]> => {
  const uid = await currentUserId();
  if (!uid) throw new Error('Not signed in');
  const { error } = await supabase.from('songs').insert({
    title: song.title, artist: song.artist, chords: song.chords,
    lyrics: song.lyrics || null, notes: song.notes || null,
    language: song.language, youtube_video_id: song.youtubeVideoId || null,
    user_id: uid,
  });
  if (error) { console.error('addSong:', error); throw new Error('Failed to add song'); }
  return loadSongs();
};

export const deleteSong = async (id: string): Promise<Song[]> => {
  const { error } = await supabase.from('songs').delete().eq('id', id);
  if (error) { console.error('deleteSong:', error); throw new Error('Failed to delete song'); }
  return loadSongs();
};

export const updateSong = async (id: string, s: Partial<Song>): Promise<Song[]> => {
  const { error } = await supabase.from('songs').update({
    title: s.title, artist: s.artist, chords: s.chords,
    lyrics: s.lyrics || null, notes: s.notes || null,
    language: s.language,
    bpm: s.bpm ?? null, rating: s.rating ?? null,
    youtube_video_id: s.youtubeVideoId ?? null,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) { console.error('updateSong:', error); throw new Error('Failed to update song'); }
  return loadSongs();
};

export const exportSongs = async (): Promise<void> => {
  const songs = await loadSongs();
  const dataStr = JSON.stringify(songs, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `guitar-songs-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

export const importSongs = async (file: File): Promise<Song[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const songs = JSON.parse(e.target?.result as string) as Song[];
        const uid = await currentUserId();
        if (!uid) return reject(new Error('Not signed in'));
        const rows = songs.map((s) => ({
          title: s.title, artist: s.artist, chords: s.chords,
          lyrics: s.lyrics || null, notes: s.notes || null,
          language: s.language, user_id: uid,
        }));
        const { error } = await supabase.from('songs').insert(rows);
        if (error) reject(new Error('Failed to import songs'));
        else resolve(await loadSongs());
      } catch { reject(new Error('Invalid file format')); }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

// ── Playlists ─────────────────────────────────────────────────────────────────
type PlaylistRow = {
  id: string; name: string; song_ids: string[] | null;
  user_id: string | null; is_public: boolean | null;
  profiles?: { username: string | null } | null;
};

function mapPlaylist(p: PlaylistRow): Playlist {
  return {
    id: p.id, name: p.name, song_ids: p.song_ids ?? [],
    userId: p.user_id ?? undefined,
    ownerUsername: p.profiles?.username ?? undefined,
    isPublic: p.is_public ?? undefined,
  };
}

const PLAYLIST_SELECT = '*, profiles:user_id(username)';

export const loadPlaylists = async (): Promise<Playlist[]> => {
  const uid = await currentUserId();
  let q = supabase.from('playlists').select(PLAYLIST_SELECT).order('created_at', { ascending: false });
  if (uid) q = q.eq('user_id', uid);
  const { data, error } = await q;
  if (error) { console.error('loadPlaylists:', error); return []; }
  return (data as PlaylistRow[]).map(mapPlaylist);
};

export const loadPlaylistsByUser = async (userId: string): Promise<Playlist[]> => {
  const { data, error } = await supabase.from('playlists').select(PLAYLIST_SELECT).eq('user_id', userId).order('created_at', { ascending: false });
  if (error) { console.error('loadPlaylistsByUser:', error); return []; }
  return (data as PlaylistRow[]).map(mapPlaylist);
};

export const addPlaylist = async (name: string): Promise<Playlist[]> => {
  const uid = await currentUserId();
  if (!uid) throw new Error('Not signed in');
  const { error } = await supabase.from('playlists').insert({ name, song_ids: [], user_id: uid });
  if (error) { console.error('addPlaylist:', error); throw new Error(error.message); }
  return loadPlaylists();
};

export const renamePlaylist = async (id: string, name: string): Promise<void> => {
  const { error } = await supabase.from('playlists').update({ name }).eq('id', id);
  if (error) throw new Error('Failed to rename playlist');
};

export const updatePlaylistSongs = async (id: string, song_ids: string[]): Promise<void> => {
  const { error } = await supabase.from('playlists').update({ song_ids }).eq('id', id);
  if (error) throw new Error('Failed to update playlist');
};

export const deletePlaylist = async (id: string): Promise<Playlist[]> => {
  const { error } = await supabase.from('playlists').delete().eq('id', id);
  if (error) throw new Error('Failed to delete playlist');
  return loadPlaylists();
};

// ── Progressions (private per user) ───────────────────────────────────────────
export const loadProgressions = async (): Promise<Progression[]> => {
  const { data, error } = await supabase.from('progressions').select('*').order('created_at', { ascending: false });
  if (error) { console.error('loadProgressions:', error); return []; }
  return data.map((p) => ({ id: p.id, name: p.name, chords: p.chords ?? [], bpm: p.bpm ?? 100 }));
};

export const addProgression = async (name: string, chords: string[], bpm: number): Promise<Progression[]> => {
  const { error } = await supabase.from('progressions').insert({ name, chords, bpm });
  if (error) throw new Error(error.message);
  return loadProgressions();
};

export const updateProgression = async (id: string, updates: Partial<Pick<Progression, 'name' | 'chords' | 'bpm'>>): Promise<void> => {
  const { error } = await supabase.from('progressions').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
};

export const deleteProgression = async (id: string): Promise<Progression[]> => {
  const { error } = await supabase.from('progressions').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return loadProgressions();
};

// ── Profiles ──────────────────────────────────────────────────────────────────
export const loadProfile = async (username: string): Promise<Profile | null> => {
  const { data, error } = await supabase.from('profiles').select('*').ilike('username', username).maybeSingle();
  if (error || !data) return null;
  return { id: data.id, username: data.username, displayName: data.display_name ?? undefined, bio: data.bio ?? undefined };
};

export const loadProfileById = async (id: string): Promise<Profile | null> => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return { id: data.id, username: data.username, displayName: data.display_name ?? undefined, bio: data.bio ?? undefined };
};

export const searchProfiles = async (q: string): Promise<Profile[]> => {
  const term = q.trim();
  if (!term) return [];
  const { data, error } = await supabase.from('profiles').select('*').ilike('username', `%${term}%`).limit(30);
  if (error) return [];
  return data.map((p) => ({ id: p.id, username: p.username, displayName: p.display_name ?? undefined, bio: p.bio ?? undefined }));
};

// ── Favorites ─────────────────────────────────────────────────────────────────
export const loadFavoriteIds = async (): Promise<Set<string>> => {
  const uid = await currentUserId();
  if (!uid) return new Set();
  const { data, error } = await supabase.from('favorites').select('song_id').eq('user_id', uid);
  if (error) return new Set();
  return new Set(data.map((r) => r.song_id));
};

export const loadFavoriteSongs = async (): Promise<Song[]> => {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data, error } = await supabase
    .from('favorites')
    .select(`created_at, songs:song_id(${SONG_SELECT})`)
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  if (error) { console.error('loadFavoriteSongs:', error); return []; }
  return (data || [])
    .flatMap((r) => (r.songs ? [r.songs as unknown as SongRow] : []))
    .map(mapSong);
};

export const toggleFavorite = async (songId: string): Promise<boolean> => {
  const uid = await currentUserId();
  if (!uid) throw new Error('Not signed in');
  const { data: existing } = await supabase.from('favorites').select('song_id').eq('user_id', uid).eq('song_id', songId).maybeSingle();
  if (existing) {
    await supabase.from('favorites').delete().eq('user_id', uid).eq('song_id', songId);
    return false;
  }
  await supabase.from('favorites').insert({ user_id: uid, song_id: songId });
  return true;
};

// ── Follows ───────────────────────────────────────────────────────────────────
export const loadFollowingIds = async (): Promise<Set<string>> => {
  const uid = await currentUserId();
  if (!uid) return new Set();
  const { data, error } = await supabase.from('follows').select('following_id').eq('follower_id', uid);
  if (error) return new Set();
  return new Set(data.map((r) => r.following_id));
};

export const isFollowing = async (userId: string): Promise<boolean> => {
  const uid = await currentUserId();
  if (!uid || uid === userId) return false;
  const { data } = await supabase.from('follows').select('following_id').eq('follower_id', uid).eq('following_id', userId).maybeSingle();
  return !!data;
};

export const toggleFollow = async (userId: string): Promise<boolean> => {
  const uid = await currentUserId();
  if (!uid) throw new Error('Not signed in');
  if (uid === userId) return false;
  const { data: existing } = await supabase.from('follows').select('following_id').eq('follower_id', uid).eq('following_id', userId).maybeSingle();
  if (existing) {
    await supabase.from('follows').delete().eq('follower_id', uid).eq('following_id', userId);
    return false;
  }
  await supabase.from('follows').insert({ follower_id: uid, following_id: userId });
  return true;
};

export const loadFollowCounts = async (userId: string): Promise<{ followers: number; following: number }> => {
  const [fRes, gRes] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  return { followers: fRes.count ?? 0, following: gRes.count ?? 0 };
};

export const loadFeed = async (): Promise<Song[]> => {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', uid);
  const ids = (follows ?? []).map((r) => r.following_id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('songs').select(SONG_SELECT).in('user_id', ids).order('created_at', { ascending: false }).limit(60);
  if (error) return [];
  return (data as SongRow[]).map(mapSong);
};

// ── Comments ──────────────────────────────────────────────────────────────────
type CommentRow = {
  id: string; song_id: string; user_id: string; body: string; created_at: string;
  profiles?: { username: string | null } | null;
};

export const loadComments = async (songId: string): Promise<Comment[]> => {
  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles:user_id(username)')
    .eq('song_id', songId)
    .order('created_at', { ascending: true });
  if (error) return [];
  return (data as CommentRow[]).map((c) => ({
    id: c.id, songId: c.song_id, userId: c.user_id,
    username: c.profiles?.username ?? 'unknown',
    body: c.body, createdAt: c.created_at,
  }));
};

export const addComment = async (songId: string, body: string): Promise<void> => {
  const uid = await currentUserId();
  if (!uid) throw new Error('Not signed in');
  const trimmed = body.trim();
  if (!trimmed) return;
  const { error } = await supabase.from('comments').insert({ song_id: songId, user_id: uid, body: trimmed });
  if (error) throw new Error(error.message);
};

export const deleteComment = async (id: string): Promise<void> => {
  const { error } = await supabase.from('comments').delete().eq('id', id);
  if (error) throw new Error(error.message);
};
