import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollToTop from "@/components/ScrollToTop";
import AppShell from "@/components/AppShell";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// Keep --font-cormorant alias pointing to Space Grotesk so all components update automatically
const fontCormorantAlias = Space_Grotesk({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const ibmMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: "Guitar Companion",
  description: "Your complete guitar practice companion — tuner, chord library, and song archive.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ background: '#000', color: '#f0f0f0', colorScheme: 'dark' }}>
      <body
        className={`${spaceGrotesk.variable} ${fontCormorantAlias.variable} ${ibmMono.variable} antialiased`}
        style={{ background: '#000', color: '#f0f0f0' }}
      >
        <AuthProvider>
          <SmoothScroll />
          <ScrollToTop />
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
