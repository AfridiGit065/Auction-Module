import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DEOVOG PREMIER LEAGUE 2026 — Live Player Auction',
  description: 'Official Live Football Player Auction platform for DPL 2026 powered by Supabase and Next.js.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div id="app-root">{children}</div>
      </body>
    </html>
  );
}
