import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import '@getpara/react-sdk/styles.css';
import { SkippedProvider } from '@/context/SkippedContext';
import Menu from '@/components/Menu';
import NewDeployment from '@/components/NewDeployment';
import { Toaster } from 'sonner';
import { WalletsProviders } from '@/context/WalletProviders';
import PWAProvider from '@/components/PWAProvider';

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
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        ></meta>
        <meta name="apple-mobile-web-app-title" content="Devconnect" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased relative`}
        style={{
          backgroundImage: `url('${process.env.NEXT_PUBLIC_APP_URL}/images/midj-epic-city3.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="fullscreen-container h-screen w-screen fixed inset-0 pt-safe pb-safe pl-safe pr-safe">
          <SkippedProvider>
            <PWAProvider>
              <WalletsProviders>
                {children}
                <NewDeployment />
                <Menu />
                <Toaster />
              </WalletsProviders>
            </PWAProvider>
          </SkippedProvider>
        </div>
      </body>
    </html>
  );
}
