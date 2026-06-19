import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { SWRConfigProvider } from "@/data/cache";
import { CacheWarmer } from "@/components/CacheWarmer";
import { Toaster } from "sonner";
import { CustomScrollbar } from "@/components/CustomScrollbar";
import { DebugPanel } from "@/components/DebugPanel";
import { ServiceWorkerUpdater } from "@/components/ServiceWorkerUpdater";
import APP_CONFIG from "@/CONFIG";

// Match the /devcon project: Inter (body) + Poppins (headings).
// next/font self-hosts these at build time, so they work offline.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: APP_CONFIG.APP_NAME,
  description: APP_CONFIG.APP_DESCRIPTION,
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
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
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
        <SWRConfigProvider>
          <CacheWarmer />
          {children}
        </SWRConfigProvider>
        <CustomScrollbar />
        <DebugPanel />
        <ServiceWorkerUpdater />
        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  );
}
