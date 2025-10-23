'use client';
// import { useEffect } from 'react';
// import { useRouter } from 'next/navigation';
import PageLayout from '@/components/PageLayout';

// import HighlightsContainer from '@/components/Highlights';
// import AnnouncementsWrapper from '@/components/Announcements';
import { homeTabs } from '../navigation';

export default function HomePageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageLayout title="World's Fair" tabs={homeTabs()}>
      {children}
    </PageLayout>
  );
}
