'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import {
  WelcomeSection,
  TodaysSchedule,
  LoopingHeader,
} from './dashboard-sections';
import HighlightsContainer from '@/components/Highlights';
import AnnouncementsWrapper from '@/components/Announcements';
import { homeTabs } from './navigation';

export default function HomePageContent() {
  const router = useRouter();

  useEffect(() => {
    const isSkipped = localStorage.getItem('loginIsSkipped');

    if (!isSkipped) {
      console.log('🔄 [HOME] Redirecting to onboarding');
      // router.push('/onboarding');
    }
  }, [router]);

  return (
    <PageLayout title="World's Fair" tabs={homeTabs()}>
      <div className="bg-[#74ACDF10] grow pb-2">
        <LoopingHeader />
        <WelcomeSection />
        <HighlightsContainer />
        <AnnouncementsWrapper />
        <TodaysSchedule />
      </div>
    </PageLayout>
  );
}
