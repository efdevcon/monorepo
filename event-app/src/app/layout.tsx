import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { SWRConfigProvider } from "@/data/cache";
import { Toaster } from "sonner";
import { CustomScrollbar } from "@/components/CustomScrollbar";
import { DebugPanel } from "@/components/DebugPanel";
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
  icons: {
    icon: "/app-icon.png",
    apple: "/app-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body>
        <SWRConfigProvider>{children}</SWRConfigProvider>
        <CustomScrollbar />
        <DebugPanel />
        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  );
}
