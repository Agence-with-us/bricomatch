import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/lib/providers';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { useEffect } from 'react';
import { useAppDispatch } from '@/lib/store/hooks'; // ✅ Chemin selon ton arborescence
import { setToken } from '@/lib/store/slices/authSlice'; // ✅

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Bricomatch Admin',
  description: 'Administration dashboard for Bricomatch platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      dispatch(setToken(savedToken));
    }
  }, [dispatch]);

  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>{children}</Providers>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
