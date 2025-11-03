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
