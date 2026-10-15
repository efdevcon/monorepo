import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { DataProvider } from "@/data/cache";
import { UserProvider } from "@/data/auth/useUser";
import { CacheWarmer } from "@/components/CacheWarmer";
import { InterestSync } from "@/data/interested/InterestSync";
import { IOSViewportHealer } from "@/components/IOSViewportHealer";
import { Toaster } from "sonner";
import { BadgeCheck, CircleAlert } from "lucide-react";
import { CustomScrollbar } from "@/components/CustomScrollbar";
import { ServiceWorkerUpdater } from "@/components/ServiceWorkerUpdater";
import { INTRO_BACKDROP, INTRO_COVER_ID, INTRO_SEEN_KEY } from "@/components/introCover";
import { PersonalizedManifestLink } from "@/components/PersonalizedManifestLink";
import { MatomoAnalytics } from "@/app/matomo";
import { FeedbackSync } from "@/data/feedback/FeedbackSync";
import { FeedbackSheet } from "@/components/feedback/FeedbackSheet";
import { FeedbackFab } from "@/components/feedback/FeedbackFab";
import { Suspense } from "react";
import APP_CONFIG from "@/CONFIG";

// Poppins everywhere (the home/announcements redesign dropped Inter — the
// app is Poppins-only). next/font self-hosts at build time for offline.
const poppins = Poppins({
  subsets: ["latin"],
  // 800 = ExtraBold, used by the desktop "Schedule" page title.
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});
// Devanagari for the home-screen greeting (नमस्कार …) only — a single weight
// so the SW precache carries one ~39KB file instead of the subset across all
// five weights. The greeting span stacks it after the latin Poppins.
const poppinsDevanagari = Poppins({
  subsets: ["devanagari"],
  weight: "800",
  variable: "--font-poppins-dev",
  display: "swap",
});

export const metadata: Metadata = {
  // Absolute base for og:url / og:image so link previews resolve. APP_ORIGIN
  // must be set to the public domain in Netlify (falls back to the
  // netlify.app URL).
  metadataBase: new URL(APP_CONFIG.APP_ORIGIN),
  title: APP_CONFIG.APP_NAME,
  description: APP_CONFIG.APP_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: APP_CONFIG.APP_NAME,
  },
  twitter: {
    card: "summary_large_image",
  },
  // Devcon icon set (copied from the devcon site).
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    // "default": the OS paints the status-bar strip opaque (theme colour,
    // white) and the page starts below it. It used to be black-translucent so
    // the header's glass could run under the strip, but since iOS 26 Liquid
    // Glass draws its own blur over any installed web app that paints under
    // the status bar (system chrome, no CSS reaches it), which stacked on our
    // glass and smeared the top of every page. env(safe-area-inset-top) is 0
    // in this mode; every --safe-top offset (globals.css) still resolves.
    // iOS reads this at install: testers must re-add the app to see a change.
    statusBarStyle: "default",
    title: APP_CONFIG.APP_NAME,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${poppinsDevanagari.variable}`}
    >
      <head>
        <PersonalizedManifestLink />
        {/* First launch of the installed app only: before anything paints,
            add a cover that continues the native launch screen (white, the
            logomark at the launch image's size) until IntroSplash has the
            backdrop decoded and takes over — otherwise the app shows for a few
            frames between the launch image and the intro. The cover is a
            <style> element injected into <head> (INTRO_COVER_ID, which the
            splash removes; the ids and paths shared with it live in
            components/introCover.ts), not an attribute on <html>: React 19 skips
            unexpected head elements when hydrating but reports a changed
            <html> attribute as a mismatch. Starts the backdrop fetch here too,
            rather than when the splash mounts after the data boot gate. The
            timeout is a safety net for a route that never mounts IntroSplash. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{" +
              "if(!(window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true))return;" +
              `if(localStorage.getItem('${INTRO_SEEN_KEY}')==='true')return;` +
              `var s=document.createElement('style');s.id='${INTRO_COVER_ID}';` +
              "s.textContent='html::after{content:\"\";position:fixed;inset:0;z-index:80;background:#fff url(/login/devcon-8-logo.svg) center/30vw auto no-repeat}';" +
              "document.head.appendChild(s);" +
              `var l=document.createElement('link');l.rel='preload';l.as='image';l.href='${INTRO_BACKDROP}';document.head.appendChild(l);` +
              "setTimeout(function(){s.remove();},5000);}catch(e){}})();",
          }}
        />
        {/* iOS native launch-screen images, shown while the installed PWA
            boots — before any JS runs. Standard Apple device-size set. */}
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
      </head>
      <body>
        {/* Capture Chromium's `beforeinstallprompt` as early as possible (before
            hydration) so the "Install app" button can fire the real native
            prompt later. If we only listened after React mounts, the event would
            have already fired and been missed — which is why tap-to-install was
            unreliable on Chrome/Brave/Vanadium. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){window.__deferredInstallPrompt=window.__deferredInstallPrompt||null;" +
              "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();" +
              "window.__deferredInstallPrompt=e;window.dispatchEvent(new Event('install-prompt-available'));});" +
              "window.addEventListener('appinstalled',function(){window.__deferredInstallPrompt=null;" +
              "window.dispatchEvent(new Event('install-prompt-available'));});})();",
          }}
        />
        <DataProvider>
          <UserProvider>
            <CacheWarmer />
            <InterestSync />
            <Suspense fallback={null}>
              <MatomoAnalytics />
            </Suspense>
            {/* Feedback lives here, outside the route segment, so the crash
                page (app/error.tsx) can still open the sheet. */}
            <FeedbackSync />
            <Suspense fallback={null}>
              <FeedbackSheet />
            </Suspense>
            <FeedbackFab />
            {children}
          </UserProvider>
        </DataProvider>
        <CustomScrollbar />
        <IOSViewportHealer />
        <ServiceWorkerUpdater />
        {/* mobileOffset lifts bottom toasts clear of the docked tab bar
            (--nav-clearance: its measured height, 0 where it isn't shown) */}
        <Toaster
          position="bottom-center"
          richColors
          // Inline style beats sonner's own font-family on the container;
          // color must go inline on each toast (toastOptions) since sonner
          // styles toast text itself. dc-fg2 = general/secondary-foreground.
          style={{ fontFamily: "var(--font-heading)" }}
          toastOptions={{
            style: { color: "var(--color-dc-fg2)", borderRadius: "10px" },
          }}
          // Figma "Sonner": lucide badge-check / circle-alert at 24px, tinted
          // to the toast's border color (richColors' fills come from
          // globals.css). Icons here are server-rendered nodes — fine to pass
          // into the client Toaster.
          icons={{
            success: <BadgeCheck className="size-6 text-dc-green" />,
            error: <CircleAlert className="size-6 text-dc-red" />,
          }}
          mobileOffset={{
            bottom: "calc(var(--nav-clearance, 0px) + 16px)",
          }}
        />
      </body>
    </html>
  );
}
