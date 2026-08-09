import type { Metadata } from 'next';
import './globals.css';
import MantineWrapper from '@/components/mantine-wrapper';

export const metadata: Metadata = {
  title: 'Group Food Ordering App',
  description: 'Create group food orders in under 1 minute, share one link, and track payments effortlessly.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="bg-slate-50 text-slate-900 antialiased min-h-screen">
        <MantineWrapper>
          {children}
        </MantineWrapper>
      </body>
    </html>
  );
}

