<div align="center">

<img src="public/banner.svg" alt="Guitar Companion Banner" width="100%"/>

</div>

<br/>

A comprehensive guitar practice companion built with Next.js, React, and TypeScript.

## Features

### 🎵 Chromatic Tuner
- Real-time pitch detection using Web Audio API
- Visual feedback with color-coded tuning bar
- Shows note, frequency, and cent deviation
- Noise filtering for accurate readings

### 🎼 Chord Library
- 27+ guitar chords (Major, Minor, 7th, Suspended)
- Interactive chord diagrams with finger positions
- Filter by chord type
- Search functionality
- Audio playback for each chord

### 📚 My Songs
- Add and manage your song collection
- Store lyrics with chord positions
- Add personal notes
- Organized display with chord tags
- Persistent storage using localStorage
- Pre-loaded with "Προσκυνητής" by Αλκίνοος Ιωαννίδης

## Getting Started

### Installation
```bash
# Navigate to the project
cd guitar-app

# Install dependencies (if not already installed)
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production
```bash
npm run build
npm start
```

## Project Structure
```
guitar-app/
├── app/
│   ├── page.tsx          # Main application page
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/
│   ├── Tuner.tsx         # Chromatic tuner component
│   ├── ChordsLibrary.tsx # Chord library component
│   ├── SongsLibrary.tsx  # Songs management component
│   └── ChordDiagram.tsx  # SVG chord diagram renderer
├── data/
│   ├── chords.ts         # Chord database
│   └── initialSongs.ts   # Pre-loaded songs
├── lib/
│   └── storage.ts        # LocalStorage utilities
└── types/
    └── index.ts          # TypeScript interfaces
```

## Technologies Used
- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Web Audio API** - Tuner and audio playback
- **LocalStorage API** - Data persistence

## Usage

### Tuner
1. Click "Start Tuner"
2. Allow microphone access
3. Play a string on your guitar
4. Tune based on visual feedback

### Chords
1. Browse or search for chords
2. Click "Play Sound" to hear the chord
3. Use filters to find specific chord types

### My Songs
1. Click "+ Add New Song"
2. Enter song details, chords, and lyrics
3. Save to your personal library
4. Click on any song to view full details
5. Delete songs you no longer need

## License
MIT
