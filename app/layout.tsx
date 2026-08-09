import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import MantineWrapper from '@/components/mantine-wrapper';
import { AuthProvider } from '@/lib/auth-context';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Group Food Ordering App',
  description: 'Create group food orders in under 1 minute, share one link, and track payments effortlessly.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${inter.className} bg-slate-50 text-slate-900 antialiased min-h-screen`}>
        <AuthProvider>
          <MantineWrapper>
            {children}
          </MantineWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}


