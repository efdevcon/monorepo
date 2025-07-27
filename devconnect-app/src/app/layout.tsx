import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import '@getpara/react-sdk/styles.css';
import { UnifiedProvider } from '@/context/UnifiedProvider';
import { SkippedProvider } from '@/context/SkippedContext';
import MobileBottomNav from '@/components/MobileBottomNav';
import { Toaster } from 'sonner';
import { Button } from 'lib/components/button';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Devconnect App',
  description:
    "Your companion for Devconnect ARG, the first Ethereum World's Fair.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Progressive Web App */}
        <link
          rel="manifest"
          href="/manifest.json"
          crossOrigin="use-credentials"
        />
        <link rel="apple-touch-icon" href="/app-icon.png" />
        <meta name="apple-mobile-web-app-title" content="Devconnect" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Devconnect" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#fbf5ee" />
        <meta name="msapplication-navbutton-color" content="#fbf5ee" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased relative min-h-screen`}
        style={{
          backgroundImage: "url('/images/midj-epic-city3.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <UnifiedProvider>
          <SkippedProvider>
            {children}
            <MobileBottomNav />
            <Toaster />
          </SkippedProvider>
        </UnifiedProvider>
      </body>
    </html>
  );
}
