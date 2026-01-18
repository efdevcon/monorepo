import type { Metadata } from "next";
import "./globals.css";
import { SWRConfigProvider } from "@/data/cache";

export const metadata: Metadata = {
  title: "Event App",
  description: "Hello World Event App",
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
      </body>
    </html>
  );
}
