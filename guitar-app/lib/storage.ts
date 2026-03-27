import { Song, Playlist, Progression } from '@/types';
import { supabase } from './supabase';

export const loadSongs = async (): Promise<Song[]> => {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading songs:', error);
    return [];
  }

  return data.map(song => ({
    id: song.id,
    title: song.title,
    artist: song.artist,
    chords: song.chords,
    lyrics: song.lyrics || undefined,
    notes: song.notes || undefined,
    language: song.language as 'greek' | 'english',
    bpm: song.bpm ?? undefined,
  }));
};

export const addSong = async (song: Omit<Song, 'id'>): Promise<Song[]> => {
  const { error } = await supabase.from('songs').insert({
    title: song.title,
    artist: song.artist,
    chords: song.chords,
    lyrics: song.lyrics || null,
    notes: song.notes || null,
    language: song.language,
  });

  if (error) {
    console.error('Error adding song:', error);
    throw new Error('Failed to add song');
  }

  return loadSongs();
};

export const deleteSong = async (id: string): Promise<Song[]> => {
  const { error } = await supabase
    .from('songs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting song:', error);
    throw new Error('Failed to delete song');
  }

  return loadSongs();
};

export const updateSong = async (id: string, updatedSong: Partial<Song>): Promise<Song[]> => {
  const { error } = await supabase
    .from('songs')
    .update({
      title: updatedSong.title,
      artist: updatedSong.artist,
      chords: updatedSong.chords,
      lyrics: updatedSong.lyrics || null,
      notes: updatedSong.notes || null,
      language: updatedSong.language,
      bpm: updatedSong.bpm ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating song:', error);
    throw new Error('Failed to update song');
  }

  return loadSongs();
};

export const exportSongs = async (): Promise<void> => {
  const songs = await loadSongs();
  const dataStr = JSON.stringify(songs, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `guitar-songs-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

// ── Playlists ─────────────────────────────────────────────────────────────────

export const loadPlaylists = async (): Promise<Playlist[]> => {
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading playlists:', error);
    return [];
  }

  return data.map((p) => ({
    id: p.id,
    name: p.name,
    song_ids: p.song_ids ?? [],
  }));
};

export const addPlaylist = async (name: string): Promise<Playlist[]> => {
  const { error } = await supabase.from('playlists').insert({ name, song_ids: [] });
  if (error) { console.error('Error adding playlist:', error); throw new Error(error.message); }
  return loadPlaylists();
};

export const renamePlaylist = async (id: string, name: string): Promise<void> => {
  const { error } = await supabase.from('playlists').update({ name }).eq('id', id);
  if (error) { console.error('Error renaming playlist:', error); throw new Error('Failed to rename playlist'); }
};

export const updatePlaylistSongs = async (id: string, song_ids: string[]): Promise<void> => {
  const { error } = await supabase.from('playlists').update({ song_ids }).eq('id', id);
  if (error) { console.error('Error updating playlist songs:', error); throw new Error('Failed to update playlist'); }
};

export const deletePlaylist = async (id: string): Promise<Playlist[]> => {
  const { error } = await supabase.from('playlists').delete().eq('id', id);
  if (error) { console.error('Error deleting playlist:', error); throw new Error('Failed to delete playlist'); }
  return loadPlaylists();
};

// ── Progressions ──────────────────────────────────────────────────────────────

export const loadProgressions = async (): Promise<Progression[]> => {
  const { data, error } = await supabase
    .from('progressions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('Error loading progressions:', error); return []; }
  return data.map((p) => ({ id: p.id, name: p.name, chords: p.chords ?? [], bpm: p.bpm ?? 100 }));
};

export const addProgression = async (name: string, chords: string[], bpm: number): Promise<Progression[]> => {
  const { error } = await supabase.from('progressions').insert({ name, chords, bpm });
  if (error) { console.error('Error adding progression:', error); throw new Error(error.message); }
  return loadProgressions();
};

export const updateProgression = async (id: string, updates: Partial<Pick<Progression, 'name' | 'chords' | 'bpm'>>): Promise<void> => {
  const { error } = await supabase.from('progressions').update(updates).eq('id', id);
  if (error) { console.error('Error updating progression:', error); throw new Error(error.message); }
};

export const deleteProgression = async (id: string): Promise<Progression[]> => {
  const { error } = await supabase.from('progressions').delete().eq('id', id);
  if (error) { console.error('Error deleting progression:', error); throw new Error(error.message); }
  return loadProgressions();
};

// ── Song import ───────────────────────────────────────────────────────────────

export const importSongs = async (file: File): Promise<Song[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const songs = JSON.parse(e.target?.result as string) as Song[];

        // Delete all existing songs first
        await supabase.from('songs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Insert all imported songs
        const songsToInsert = songs.map(song => ({
          title: song.title,
          artist: song.artist,
          chords: song.chords,
          lyrics: song.lyrics || null,
          notes: song.notes || null,
          language: song.language,
        }));

        const { error } = await supabase.from('songs').insert(songsToInsert);

        if (error) {
          reject(new Error('Failed to import songs'));
        } else {
          const updatedSongs = await loadSongs();
          resolve(updatedSongs);
        }
      } catch {
        reject(new Error('Invalid file format'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};
