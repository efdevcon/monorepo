import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import '@getpara/react-sdk/styles.css';
import NewDeployment from '@/components/NewDeployment';
import { Toaster } from 'sonner';
import { WalletsProviders } from '@/context/WalletProviders';
import { WalletProvider } from '@/context/WalletContext';
import PWAProvider from '@/components/PWAProvider';
import { GlobalStoreProvider } from '@/app/store.provider';
import { getAtprotoEvents } from '@/utils/atproto-events';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';

// import { unstable_cache } from 'next/cache';
// import { verifyAuthWithHeaders } from '@/app/api/auth/middleware';
// import { headers } from 'next/headers';
// import { ensureUser } from '@/app/api/auth/user-data/ensure-user';

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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // very  important you know this
};

export async function generateMetadata(): Promise<Metadata> {
  const APP_NAME = 'Devconnect App';
  const APP_DESCRIPTION =
    "Your companion for Devconnect ARG, the first Ethereum World's Fair.";
  const image = `${process.env.NEXT_PUBLIC_APP_URL}/social.jpg`;

  return {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    applicationName: 'Devconnect',
    manifest: '/manifest.json',
    formatDetection: {
      telephone: false,
    },
    icons: {
      icon: '/app-icon.png',
      apple: '/app-icon.png',
    },
    appleWebApp: {
      title: 'Devconnect',
      capable: true,
      statusBarStyle: 'black-translucent',
    },
    // themeColor: '#fbf5ee',
    other: {
      'mobile-web-app-capable': 'yes',
      'apple-touch-fullscreen': 'yes',
      'msapplication-navbutton-color': '#fbf5ee',
    } as Record<string, string>,
    openGraph: {
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: 'Devconnect Argentina',
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: APP_NAME,
      description: APP_DESCRIPTION,
      images: [image],
    },
  };
}

export const revalidate = 300; // 5 minutes

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Constants needed for commented meta tags (now handled by generateMetadata)
  // const APP_NAME = 'Devconnect App';
  // const APP_DESCRIPTION =
  //   "Your companion for Devconnect ARG, the first Ethereum World's Fair.";
  // const image = `${process.env.NEXT_PUBLIC_APP_URL}/social.jpg`;

  // Check if Supabase is configured
  // const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // This does not work on the server side because the relevant headers are not available
  // We could use cookies instead so its autoincluded?
  // const headersList = await headers();
  // const authResult = await verifyAuthWithHeaders(headersList as Headers);

  // let userData = null;

  // if (authResult.success) {
  //   userData = await ensureUser(authResult.user?.email || '');
  // }

  // Cache the atproto events for 5 minutes - wrapped in unstable_cache to avoid re-fetching the events on every request
  // const atprotoEvents = await unstable_cache(
  //   getAtprotoEvents,
  //   ['atproto-events'],
  //   {
  //     revalidate: 300,
  //   }
  // )();

  const t = await getTranslations();
  const atprotoEvents = await getAtprotoEvents();

  return (
    <html lang="en">
      <head>
        {/* Progressive Web App */}
        {/* <link
          rel="manifest"
          href="/manifest.json"
          crossOrigin="use-credentials"
        /> */}
        {/* <link rel="apple-touch-icon" href="/app-icon.png" /> */}

        {/* Meta tags now handled by generateMetadata function above */}
        {/*
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
        */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PWAProvider>
          <NextIntlClientProvider>
            <WalletsProviders>
              <GlobalStoreProvider
                events={atprotoEvents} /*userData={userData}*/
              >
                <WalletProvider>
                  {children}
                  <NewDeployment />
                </WalletProvider>
              </GlobalStoreProvider>
            </WalletsProviders>
          </NextIntlClientProvider>
        </PWAProvider>

        <Toaster />
        <div id="requires-auth-modal" />
      </body>
    </html>
  );
}
