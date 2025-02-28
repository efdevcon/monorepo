import type { Metadata, Viewport } from "next";
import { PropsWithChildren } from "react";
import {
  SITE_NAME,
  SITE_URL,
  SITE_DESCRIPTION,
  SOCIAL_TWITTER,
} from "@/utils/site";
import { Layout } from "@/components/layout";
import { QueryProvider } from "@/providers/query";
import "@/assets/globals.css";
import "@/assets/css/index.scss";
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";

export const metadata: Metadata = {
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  metadataBase: new URL(SITE_URL),
  description: SITE_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    title: SITE_NAME,
    capable: true,
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    title: SITE_NAME,
    siteName: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: "/opengraph-image",
  },
  twitter: {
    card: "summary_large_image",
    site: SOCIAL_TWITTER,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: "/opengraph-image",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  height: "device-height",
  initialScale: 1.0,
  viewportFit: "cover",
  themeColor: "#30354b",
};

export default async function RootLayout(props: PropsWithChildren) {
  const queryClient = new QueryClient();

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="favicon.ico" sizes="any" />
        <link rel="shortcut icon" href="favicon.ico" sizes="any" />
        <link
          rel="apple-touch-icon"
          href="/icons/apple-touch-icon.png"
          type="image/png"
          sizes="any"
        />
      </head>
      <body>
        <QueryProvider>
          <HydrationBoundary state={dehydrate(queryClient)}>
            <Layout>{props.children}</Layout>
          </HydrationBoundary>
        </QueryProvider>
      </body>
    </html>
  );
}
