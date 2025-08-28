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
import Auth from '@/components/Auth';
// Remove config import to avoid Para SDK import in server component
// import { APP_CONFIG, APP_NAME, APP_DESCRIPTION } from '@/config/config';

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
  // Define values inline to avoid Para SDK import
  const APP_NAME = 'Devconnect App';
  const APP_DESCRIPTION =
    "Your companion for Devconnect ARG, the first Ethereum World's Fair.";
  const image = `${process.env.NEXT_PUBLIC_APP_URL}/social.jpg`;

  // Check if Supabase is configured
  const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
          content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, shrink-to-fit=no"
        />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />

        <meta property="og:image" content={image} key="og_image" />
        <meta property="og:image:url" content={image} key="og_image_url" />
        <meta
          property="og:image:secure_url"
          content={image}
          key="og_image_secure_url"
        />
        <meta
          property="og:image:alt"
          content="Devconnect Argentina"
          key="og_image_alt"
        />
        <meta
          property="og:image:type"
          content="image/png"
          key="og_image_type"
        />
        <meta property="og:image:width" content="1200" key="og_image_width" />
        <meta property="og:image:height" content="630" key="og_image_height" />

        <meta name="twitter:card" content="summary_large_image" key="tw_card" />
        <meta name="twitter:title" content={APP_NAME} key="tw_title" />
        <meta
          name="twitter:description"
          content={APP_DESCRIPTION}
          key="tw_description"
        />
        <meta name="twitter:image" content={image} key="tw_image" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased relative`}
        style={{
          backgroundImage: `url('${process.env.NEXT_PUBLIC_APP_URL}/images/midj-epic-city3.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="fullscreen-container flex flex-col justify-center">
          {hasSupabase ? (
            <Auth>
              <SkippedProvider>
                <PWAProvider>
                  <WalletsProviders>
                    {children}
                    <Menu />
                    <NewDeployment />
                  </WalletsProviders>
                </PWAProvider>
              </SkippedProvider>
            </Auth>
          ) : (
            <SkippedProvider>
              <PWAProvider>
                <WalletsProviders>
                  {children}
                  <Menu />
                  <NewDeployment />
                </WalletsProviders>
              </PWAProvider>
            </SkippedProvider>
          )}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
