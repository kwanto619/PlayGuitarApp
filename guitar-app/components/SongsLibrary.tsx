'use client';

import { useState, useEffect } from 'react';
import { Song } from '@/types';
import { loadSongs, addSong, deleteSong, updateSong } from '@/lib/storage';

export default function SongsLibrary() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [languageFilter, setLanguageFilter] = useState<'all' | 'greek' | 'english'>('all');
  const [newSong, setNewSong] = useState({
    title: '',
    artist: '',
    chords: '',
    lyrics: '',
    notes: '',
    language: 'english' as 'greek' | 'english',
  });
  const [editedSong, setEditedSong] = useState({
    title: '',
    artist: '',
    chords: '',
    lyrics: '',
    notes: '',
    language: 'english' as 'greek' | 'english',
  });

  useEffect(() => {
    setSongs(loadSongs());
  }, []);

  const handleAddSong = () => {
    if (!newSong.title || !newSong.artist) {
      alert('Title and artist are required!');
      return;
    }

    const song: Song = {
      id: Date.now().toString(),
      title: newSong.title,
      artist: newSong.artist,
      chords: newSong.chords.split(',').map((c) => c.trim()).filter(Boolean),
      lyrics: newSong.lyrics || undefined,
      notes: newSong.notes || undefined,
      language: newSong.language,
    };

    const updatedSongs = addSong(song);
    setSongs(updatedSongs);
    setNewSong({ title: '', artist: '', chords: '', lyrics: '', notes: '', language: 'english' });
    setShowAddForm(false);
  };

  const handleDeleteSong = (id: string) => {
    if (confirm('Are you sure you want to delete this song?')) {
      const updatedSongs = deleteSong(id);
      setSongs(updatedSongs);
      if (selectedSong?.id === id) {
        setSelectedSong(null);
      }
    }
  };

  const handleEditSong = () => {
    if (!selectedSong) return;

    setEditedSong({
      title: selectedSong.title,
      artist: selectedSong.artist,
      chords: selectedSong.chords.join(', '),
      lyrics: selectedSong.lyrics || '',
      notes: selectedSong.notes || '',
      language: selectedSong.language,
    });
    setEditMode(true);
  };

  const handleSaveEdit = () => {
    if (!selectedSong || !editedSong.title || !editedSong.artist) {
      alert('Title and artist are required!');
      return;
    }

    const updatedSong: Song = {
      ...selectedSong,
      title: editedSong.title,
      artist: editedSong.artist,
      chords: editedSong.chords.split(',').map((c) => c.trim()).filter(Boolean),
      lyrics: editedSong.lyrics || undefined,
      notes: editedSong.notes || undefined,
      language: editedSong.language,
    };

    const updatedSongs = updateSong(selectedSong.id, updatedSong);
    setSongs(updatedSongs);
    setSelectedSong(updatedSong);
    setEditMode(false);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditedSong({ title: '', artist: '', chords: '', lyrics: '', notes: '', language: 'english' });
  };

  return (
    <div>
      <div className="mb-8 flex justify-center">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-custom-orange hover:bg-custom-orange-hover text-white px-8 py-4 rounded-full font-semibold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
        >
          {showAddForm ? '✕ Cancel' : '+ Add New Song'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-gray-800 border border-gray-700 rounded-3xl p-8 shadow-2xl mb-8 max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-custom-orange mb-6">Add New Song</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Song Title *"
              value={newSong.title}
              onChange={(e) => setNewSong({ ...newSong, title: e.target.value })}
              className="w-full px-6 py-3 rounded-xl border-2 border-gray-600 bg-gray-900 text-white placeholder-gray-500 focus:border-custom-orange outline-none text-lg"
            />
            <input
              type="text"
              placeholder="Artist *"
              value={newSong.artist}
              onChange={(e) => setNewSong({ ...newSong, artist: e.target.value })}
              className="w-full px-6 py-3 rounded-xl border-2 border-gray-600 bg-gray-900 text-white placeholder-gray-500 focus:border-custom-orange outline-none text-lg"
            />
            <input
              type="text"
              placeholder="Chords (comma separated, e.g., Am, F, Dm, Em)"
              value={newSong.chords}
              onChange={(e) => setNewSong({ ...newSong, chords: e.target.value })}
              className="w-full px-6 py-3 rounded-xl border-2 border-gray-600 bg-gray-900 text-white placeholder-gray-500 focus:border-custom-orange outline-none text-lg"
            />
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Language *</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setNewSong({ ...newSong, language: 'greek' })}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold text-lg transition-all ${
                    newSong.language === 'greek'
                      ? 'bg-custom-orange text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Greek
                </button>
                <button
                  type="button"
                  onClick={() => setNewSong({ ...newSong, language: 'english' })}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold text-lg transition-all ${
                    newSong.language === 'english'
                      ? 'bg-custom-orange text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  English
                </button>
              </div>
            </div>
            <input
              type="text"
              placeholder="Notes (optional)"
              value={newSong.notes}
              onChange={(e) => setNewSong({ ...newSong, notes: e.target.value })}
              className="w-full px-6 py-3 rounded-xl border-2 border-gray-600 bg-gray-900 text-white placeholder-gray-500 focus:border-custom-orange outline-none text-lg"
            />
            <textarea
              placeholder="Lyrics (optional)"
              value={newSong.lyrics}
              onChange={(e) => setNewSong({ ...newSong, lyrics: e.target.value })}
              className="w-full px-6 py-3 rounded-xl border-2 border-gray-600 bg-gray-900 text-white placeholder-gray-500 focus:border-custom-orange outline-none text-lg min-h-[200px] font-mono"
            />
            <button
              onClick={handleAddSong}
              className="w-full bg-custom-orange hover:bg-custom-orange-hover text-white py-4 rounded-xl font-semibold text-lg hover:scale-[1.02] transition-all shadow-lg"
            >
              Save Song
            </button>
          </div>
        </div>
      )}

      {selectedSong ? (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setSelectedSong(null); setEditMode(false); }}>
          <div className="bg-gray-800 border border-gray-700 rounded-3xl p-10 shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                {editMode ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editedSong.title}
                      onChange={(e) => setEditedSong({ ...editedSong, title: e.target.value })}
                      className="w-full text-4xl font-bold text-custom-orange bg-gray-900 px-4 py-2 rounded-xl border-2 border-gray-600 focus:border-custom-orange outline-none"
                    />
                    <input
                      type="text"
                      value={editedSong.artist}
                      onChange={(e) => setEditedSong({ ...editedSong, artist: e.target.value })}
                      className="w-full text-2xl text-gray-300 bg-gray-900 px-4 py-2 rounded-xl border-2 border-gray-600 focus:border-custom-orange outline-none"
                    />
                  </div>
                ) : (
                  <>
                    <h3 className="text-4xl font-bold text-custom-orange mb-2">{selectedSong.title}</h3>
                    <p className="text-2xl text-gray-300">{selectedSong.artist}</p>
                  </>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                {!editMode && (
                  <button
                    onClick={handleEditSong}
                    className="text-custom-orange hover:text-custom-orange font-bold text-2xl px-4 py-2 hover:bg-gray-700 rounded-lg transition-all"
                    title="Edit song"
                  >
                    ✎
                  </button>
                )}
                <button
                  onClick={() => { setSelectedSong(null); setEditMode(false); }}
                  className="text-gray-400 hover:text-gray-200 font-bold text-3xl px-4 py-2 hover:bg-gray-700 rounded-lg transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            {editMode ? (
              <div className="space-y-6">
                <div>
                  <label className="font-semibold text-xl text-gray-300 mb-3 block">Chords:</label>
                  <input
                    type="text"
                    value={editedSong.chords}
                    onChange={(e) => setEditedSong({ ...editedSong, chords: e.target.value })}
                    placeholder="Am, F, Dm, Em"
                    className="w-full px-6 py-3 rounded-xl border-2 border-gray-600 bg-gray-900 text-white placeholder-gray-500 focus:border-custom-orange outline-none text-lg"
                  />
                </div>

                <div>
                  <label className="font-semibold text-xl text-gray-300 mb-3 block">Language:</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setEditedSong({ ...editedSong, language: 'greek' })}
                      className={`flex-1 px-6 py-3 rounded-xl font-semibold text-lg transition-all ${
                        editedSong.language === 'greek'
                          ? 'bg-custom-orange text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Greek
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditedSong({ ...editedSong, language: 'english' })}
                      className={`flex-1 px-6 py-3 rounded-xl font-semibold text-lg transition-all ${
                        editedSong.language === 'english'
                          ? 'bg-custom-orange text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-xl text-gray-300 mb-3 block">Notes:</label>
                  <input
                    type="text"
                    value={editedSong.notes}
                    onChange={(e) => setEditedSong({ ...editedSong, notes: e.target.value })}
                    className="w-full px-6 py-3 rounded-xl border-2 border-gray-600 bg-gray-900 text-white focus:border-custom-orange outline-none text-lg"
                  />
                </div>

                <div>
                  <label className="font-semibold text-xl text-gray-300 mb-3 block">Lyrics:</label>
                  <textarea
                    value={editedSong.lyrics}
                    onChange={(e) => setEditedSong({ ...editedSong, lyrics: e.target.value })}
                    className="w-full px-6 py-3 rounded-xl border-2 border-gray-600 bg-gray-900 text-white focus:border-custom-orange outline-none text-lg min-h-[300px] font-mono"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 bg-custom-orange hover:bg-custom-orange-hover text-white py-4 rounded-xl font-semibold text-lg hover:scale-[1.02] transition-all shadow-lg"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-4 rounded-xl font-semibold text-lg hover:scale-[1.02] transition-all shadow-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h4 className="font-semibold text-xl text-gray-300 mb-4">Chords:</h4>
                  <div className="flex flex-wrap gap-3">
                    {selectedSong.chords.map((chord, idx) => (
                      <span
                        key={idx}
                        className="bg-custom-orange text-white px-6 py-3 rounded-full font-semibold text-lg shadow-md"
                      >
                        {chord}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedSong.notes && (
                  <div className="mb-8">
                    <h4 className="font-semibold text-xl text-gray-300 mb-4">Notes:</h4>
                    <p className="text-lg text-gray-300 italic bg-gray-900 p-6 rounded-xl">{selectedSong.notes}</p>
                  </div>
                )}

                {selectedSong.lyrics && (
                  <div>
                    <h4 className="font-semibold text-xl text-gray-300 mb-4">Lyrics:</h4>
                    <pre className="whitespace-pre-wrap font-mono text-base text-gray-300 bg-gray-900 p-8 rounded-xl leading-relaxed">
                      {selectedSong.lyrics}
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}

      <div className="mb-8 flex justify-center gap-3">
        <button
          onClick={() => setLanguageFilter('all')}
          className={`px-7 py-3 rounded-full font-semibold transition-all ${
            languageFilter === 'all'
              ? 'bg-custom-orange text-white shadow-xl scale-110'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:scale-105'
          }`}
        >
          All Songs
        </button>
        <button
          onClick={() => setLanguageFilter('greek')}
          className={`px-7 py-3 rounded-full font-semibold transition-all ${
            languageFilter === 'greek'
              ? 'bg-custom-orange text-white shadow-xl scale-110'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:scale-105'
          }`}
        >
          🇬🇷 Greek
        </button>
        <button
          onClick={() => setLanguageFilter('english')}
          className={`px-7 py-3 rounded-full font-semibold transition-all ${
            languageFilter === 'english'
              ? 'bg-custom-orange text-white shadow-xl scale-110'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:scale-105'
          }`}
        >
          🇬🇧 English
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="text-3xl font-bold text-custom-orange mb-6">
          {languageFilter === 'all' ? 'All Songs' : languageFilter === 'greek' ? 'Greek Songs' : 'English Songs'} ({songs.filter(s => languageFilter === 'all' || s.language === languageFilter).length})
        </h3>
        {songs.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 text-center text-gray-400">
            <p className="text-xl">No songs yet. Add your first song!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {songs.filter(song => languageFilter === 'all' || song.language === languageFilter).map((song) => (
              <div
                key={song.id}
                className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg hover:shadow-xl hover:border-custom-orange transition-all cursor-pointer hover:-translate-y-1"
                onClick={() => setSelectedSong(song)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-2xl font-bold text-custom-orange">{song.title}</h4>
                    <p className="text-lg text-gray-400">{song.artist}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSong(song.id);
                    }}
                    className="text-red-500 hover:text-red-400 font-bold text-xl px-3 py-1 hover:bg-gray-700 rounded-lg transition-all"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {song.chords.map((chord, idx) => (
                    <span
                      key={idx}
                      className="bg-custom-orange text-white px-4 py-1 rounded-full text-sm font-semibold shadow-md"
                    >
                      {chord}
                    </span>
                  ))}
                </div>
                {song.notes && (
                  <p className="mt-3 text-sm text-gray-400 italic line-clamp-2">{song.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
