import type { Metadata } from "next";
import "./globals.css";
import { SWRConfigProvider } from "@/data/cache";
import { Toaster } from "sonner";
import APP_CONFIG from "@/CONFIG";

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
    <html lang="en">
      <body>
        <SWRConfigProvider>{children}</SWRConfigProvider>
        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  );
}
