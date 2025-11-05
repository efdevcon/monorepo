import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Offline',
};

export default function Page() {
  return (
    <>
      <h1>Currently offline - try refreshing the page or restarting the app</h1>
    </>
  );
}
