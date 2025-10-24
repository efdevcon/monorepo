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
import { getNotionTable } from '@/services/getNotionTable';
import moment from 'moment';

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

  // const t = await getTranslations();
  const atprotoEvents = await getAtprotoEvents();
  const announcementsRaw = await getNotionTable(
    '295638cdc41580fe8d85ff5487f71277',
    undefined,
    undefined,
    'Notification Send Time'
  );

  // Normalize announcements to match component props
  const now = moment.utc(); // .subtract(3, 'hour'); // Argentina is 3 hours behind UTC
  const announcements = announcementsRaw
    .map((announcement) => {
      // console.log(now.toISOString());
      // console.log(
      //   moment.utc(announcement['Notification Send Time']).toISOString()
      // );
      // console.log(
      //   moment.utc(announcement['Notification Send Time']).isSameOrBefore(now)
      // );
      return {
        id: announcement.id,
        title:
          announcement['Name'] || announcement['Call To Action Text'] || '',
        message: announcement['Description'] || '',
        sendAt: announcement['Notification Send Time'],
        seen: false,
        cta: announcement['Call To Action Text'] || undefined,
        ctaLink: announcement['Call To Action URL'] || undefined,
      };
    })
    .filter((announcement) => {
      if (process.env.NODE_ENV === 'development') {
        return true;
      }
      // Filter out announcements without titles and those scheduled for the future
      return (
        announcement.title !== '' &&
        moment.utc(announcement.sendAt).isSameOrBefore(now)
      );
    });

  return (
    <html lang="en">
      <head>
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/launch-640x1136.png"
          media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/launch-750x1334.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/launch-828x1792.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/launch-1125x2436.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/launch-1136x640.png"
          media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/launch-1242x2208.png"
          media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/launch-1242x2688.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/launch-1334x750.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/launch-1536x2048.png"
          media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/launch-1668x2224.png"
          media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/launch-1668x2388.png"
          media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/launch-1792x828.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/launch-2048x1536.png"
          media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/launch-2048x2732.png"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/launch-2208x1242.png"
          media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/launch-2224x1668.png"
          media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/launch-2388x1668.png"
          media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/launch-2436x1125.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/launch-2688x1242.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/launch-2732x2048.png"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
        />
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
                announcements={announcements}
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
