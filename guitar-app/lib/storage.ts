import { Song } from '@/types';
import { initialSongs } from '@/data/initialSongs';

const STORAGE_KEY = 'guitar-app-songs';

export const saveSongs = (songs: Song[]): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
  }
};

export const loadSongs = (): Song[] => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    } else {
      // First time - save and return initial songs
      saveSongs(initialSongs);
      return initialSongs;
    }
  }
  return [];
};

export const addSong = (song: Song): Song[] => {
  const songs = loadSongs();
  songs.push(song);
  saveSongs(songs);
  return songs;
};

export const deleteSong = (id: string): Song[] => {
  const songs = loadSongs().filter(song => song.id !== id);
  saveSongs(songs);
  return songs;
};

export const updateSong = (id: string, updatedSong: Partial<Song>): Song[] => {
  const songs = loadSongs().map(song =>
    song.id === id ? { ...song, ...updatedSong } : song
  );
  saveSongs(songs);
  return songs;
};

export const resetSongs = (): Song[] => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  saveSongs(initialSongs);
  return initialSongs;
};

export const exportSongs = (): void => {
  const songs = loadSongs();
  const dataStr = JSON.stringify(songs, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `guitar-songs-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

export const importSongs = (file: File): Promise<Song[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const songs = JSON.parse(e.target?.result as string) as Song[];
        saveSongs(songs);
        resolve(songs);
      } catch (error) {
        reject(new Error('Invalid file format'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};
