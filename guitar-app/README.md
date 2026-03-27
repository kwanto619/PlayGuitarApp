
# Guitar Companion

A modern guitar practice companion built with Next.js, React, and TypeScript. Black, white and teal design with a full suite of tools for guitarists — from tuning and chord reference to song management and live practice aids.

## Features

### Chromatic Tuner
- Real-time pitch detection via Web Audio API
- Analog-style dial with needle indicator
- Shows note name, frequency, and cent deviation
- Noise filtering for accurate readings

### Chord Library
- 120+ chords across all 12 notes and 10 types (Major, Minor, 7th, Maj7, m7, Dim, Aug, Sus2, Sus4, Add9)
- Interactive SVG chord diagrams with finger numbers
- Filter by chord type, search by name
- Hover over any chord name in a song's lyrics to see its diagram

### My Songs
- Add and manage your full song collection
- Store lyrics with inline chord markers — chords highlight and show diagrams on hover
- Add personal notes per song
- Import songs directly from tabsy.gr (auto-extracts title, artist, and chords)
- Export / import your entire library as JSON

### Playlists
- Create named playlists (setlists, practice sets, etc.)
- Add and remove songs from your library
- Reorder songs within a playlist

### Metronome
- BPM slider (40–240), tap tempo, and visual beat dots
- Web Audio API lookahead scheduler for precise timing
- BPM saved per song — opens pre-loaded when you navigate from a song
- Tempo name display (Largo → Presto)

### Transpose Tool
- Per-song +/− semitone buttons shift all chords instantly
- Transposed chords shown in both the chord list and inline in lyrics
- One-click "Save transposed chords" to persist the new key

### Auto-scroll Lyrics
- Floating play/pause bar at the bottom of any song with lyrics
- Adjustable scroll speed (0.2× – 5×) — hands-free while playing

### Chord Progression Builder
- Build progressions like Am – F – C – G
- Loop playback with metronome timing (selectable beats per chord)
- Save and manage multiple progressions
- Live chord diagram shown for the currently playing chord

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project with the following tables:

```sql
-- Songs
create table songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  chords text[] not null default '{}',
  lyrics text,
  notes text,
  language text not null default 'english',
  bpm integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Playlists
create table playlists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  song_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Chord Progressions
create table progressions (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  chords text[] not null default '{}',
  bpm integer not null default 100,
  created_at timestamptz not null default now()
);
```

### Installation

```bash
cd guitar-app
npm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

```bash
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
│   ├── page.tsx              # Home — navigation cards
│   ├── layout.tsx            # Root layout + fonts
│   ├── globals.css           # Design tokens + global styles
│   ├── tuner/                # Chromatic tuner page
│   ├── chords/               # Chord library page
│   ├── songs/
│   │   ├── page.tsx          # Songs list
│   │   └── [id]/page.tsx     # Song detail (transpose, auto-scroll, BPM)
│   ├── playlists/            # Playlists page
│   ├── metronome/            # Metronome page
│   └── progressions/         # Chord progression builder page
├── components/
│   ├── Tuner.tsx
│   ├── ChordsLibrary.tsx
│   ├── SongsLibrary.tsx
│   ├── ChordDiagram.tsx      # SVG chord diagram renderer
│   ├── ChordTooltip.tsx      # Hover tooltip with chord diagram
│   ├── GeneralImport.tsx     # Import from tabsy.gr
│   ├── PlaylistsLibrary.tsx
│   ├── Metronome.tsx         # Web Audio lookahead metronome
│   └── ProgressionBuilder.tsx
├── data/
│   └── chords.ts             # Full chord database (120+ chords)
├── lib/
│   ├── storage.ts            # Supabase CRUD helpers
│   ├── supabase.ts           # Supabase client
│   └── transpose.ts          # Chord transposition utilities
└── types/
    └── index.ts              # TypeScript interfaces
```

## Tech Stack

- **Next.js 15** — React framework (App Router)
- **TypeScript** — type safety throughout
- **Supabase** — PostgreSQL database + real-time
- **Web Audio API** — tuner pitch detection, metronome scheduling, chord playback
- **Space Grotesk** — UI font (via next/font)

## License

MIT
