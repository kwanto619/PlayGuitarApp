import jsPDF from 'jspdf';
import type { Song } from '@/types';

// jsPDF's built-in fonts (helvetica/courier) use WinAnsi encoding and have no
// Greek glyphs, so Greek lyrics render as mojibake. We embed DejaVu Sans Mono
// (full Greek coverage, monospaced for chord alignment) and register it at
// runtime. Fonts are fetched once and cached as base64.
const FONT_REGULAR = '/fonts/DejaVuSansMono.ttf';
const FONT_BOLD = '/fonts/DejaVuSansMono-Bold.ttf';
const FONT_FAMILY = 'DejaVuSansMono';

let fontCache: { regular: string; bold: string } | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function loadFonts(): Promise<{ regular: string; bold: string }> {
  if (fontCache) return fontCache;
  const [reg, bold] = await Promise.all([
    fetch(FONT_REGULAR).then((r) => r.arrayBuffer()),
    fetch(FONT_BOLD).then((r) => r.arrayBuffer()),
  ]);
  fontCache = {
    regular: arrayBufferToBase64(reg),
    bold: arrayBufferToBase64(bold),
  };
  return fontCache;
}

// Strip [tab] ... [/tab] and [ch] ... [/ch] if still present, return raw text.
// Tokenise each line into chord spans + lyric spans so we can render chords bold.
interface LineToken { type: 'text' | 'chord'; value: string; }

function tokenizeLine(line: string): LineToken[] {
  // Split on [chord] markers — ChordTooltip uses square brackets convention
  const parts = line.split(/(\[[^\]]+\])/g);
  const tokens: LineToken[] = [];
  for (const part of parts) {
    if (!part) continue;
    const m = part.match(/^\[([^\]]+)\]$/);
    if (m) tokens.push({ type: 'chord', value: m[1] });
    else tokens.push({ type: 'text', value: part });
  }
  return tokens;
}

export async function exportSongPdf(song: Song): Promise<void> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  // Register the Unicode font (Greek-capable) before any text is drawn.
  const fonts = await loadFonts();
  doc.addFileToVFS('DejaVuSansMono.ttf', fonts.regular);
  doc.addFont('DejaVuSansMono.ttf', FONT_FAMILY, 'normal');
  doc.addFileToVFS('DejaVuSansMono-Bold.ttf', fonts.bold);
  doc.addFont('DejaVuSansMono-Bold.ttf', FONT_FAMILY, 'bold');

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  // Title
  doc.setFont(FONT_FAMILY, 'bold');
  doc.setFontSize(20);
  doc.text(song.title, margin, y);
  y += 26;

  // Artist
  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(12);
  doc.text(song.artist, margin, y);
  y += 18;

  // Meta line
  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(9);
  const meta: string[] = [];
  if (song.bpm) meta.push(`BPM: ${song.bpm}`);
  meta.push(`Language: ${song.language === 'greek' ? 'Greek' : 'English'}`);
  if (song.uploaderUsername) meta.push(`Uploaded by: @${song.uploaderUsername}`);
  doc.setTextColor(110);
  doc.text(meta.join('   •   '), margin, y);
  doc.setTextColor(0);
  y += 16;

  // Chords summary
  if (song.chords.length > 0) {
    doc.setFont(FONT_FAMILY, 'bold');
    doc.setFontSize(10);
    doc.text('Chords:', margin, y);
    doc.setFont(FONT_FAMILY, 'normal');
    doc.text(song.chords.join('   '), margin + 48, y);
    y += 18;
  }

  // Divider
  doc.setDrawColor(180);
  doc.line(margin, y, pageW - margin, y);
  y += 18;

  // Lyrics body
  if (!song.lyrics) {
    doc.setFontSize(11);
    doc.setTextColor(120);
    doc.text('(No lyrics)', margin, y);
    doc.save(`${song.title} - ${song.artist}.pdf`);
    return;
  }

  // Monospace so chord-above-lyric alignment stays close to source
  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(10);
  const lineH = 14;
  const maxY = pageH - margin;

  const lines = song.lyrics.split('\n');
  for (const raw of lines) {
    if (y + lineH * 2 > maxY) { doc.addPage(); y = margin; }
    const tokens = tokenizeLine(raw);
    const hasChord = tokens.some((t) => t.type === 'chord');
    if (hasChord) {
      // Render chord line then lyric line beneath, aligned by column width of courier
      const charW = doc.getTextWidth('M'); // courier is monospaced
      let col = 0;
      let chordLine = '';
      let lyricLine = '';
      for (const t of tokens) {
        if (t.type === 'chord') {
          // pad chord to column
          while (chordLine.length < col) chordLine += ' ';
          chordLine += t.value;
        } else {
          lyricLine += t.value;
          col = lyricLine.length;
        }
      }
      // Chord row
      doc.setFont(FONT_FAMILY, 'bold');
      doc.setTextColor(0, 130, 120);
      doc.text(chordLine, margin, y, { maxWidth: pageW - margin * 2 });
      y += lineH;
      // Lyric row
      doc.setFont(FONT_FAMILY, 'normal');
      doc.setTextColor(0);
      const wrapped = doc.splitTextToSize(lyricLine, pageW - margin * 2);
      for (const w of wrapped as string[]) {
        if (y + lineH > maxY) { doc.addPage(); y = margin; }
        doc.text(w, margin, y);
        y += lineH;
      }
      // suppress unused
      void charW;
    } else {
      doc.setFont(FONT_FAMILY, 'normal');
      doc.setTextColor(0);
      const wrapped = doc.splitTextToSize(raw, pageW - margin * 2);
      for (const w of wrapped as string[]) {
        if (y + lineH > maxY) { doc.addPage(); y = margin; }
        doc.text(w, margin, y);
        y += lineH;
      }
    }
  }

  doc.save(`${song.title} - ${song.artist}.pdf`);
}
