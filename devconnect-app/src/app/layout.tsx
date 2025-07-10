import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Web3Provider } from '@/context/web3';
import { AccountContextProvider } from '@/context/account-context-provider';

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased relative min-h-screen`}
        style={{
          backgroundImage: "url('/images/midj-epic-city3.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <Web3Provider>
          <AccountContextProvider>{children}</AccountContextProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
