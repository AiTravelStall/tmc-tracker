import type { Metadata } from 'next';
import { DM_Sans, Staatliches } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-dm-sans', display: 'swap' });
const staatliches = Staatliches({ subsets: ['latin'], weight: '400', variable: '--font-staatliches', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { template: '%s | TMC Tracker', default: 'TMC Tracker' },
  description: 'The Modern Classroom school outreach tracker',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${staatliches.variable}`}>
      <body>{children}</body>
    </html>
  );
}
