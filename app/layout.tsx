// app/layout.tsx (serveur)
import './globals.css';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import ClientAuthSetup from './ClientAuthSetup';
import { Providers } from '../lib/providers'; // assure-toi que c’est client

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ClientAuthSetup />
          <Providers>{children}</Providers>  {/* ici Redux Provider côté client */}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
