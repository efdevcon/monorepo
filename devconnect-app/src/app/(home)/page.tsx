'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  WelcomeSection,
  TodaysSchedule,
  LoopingHeader,
  PracticalInfo,
} from '../dashboard-sections';
import HighlightsContainer from '@/components/Highlights';
import AnnouncementsWrapper from '@/components/Announcements';
import { Separator } from 'lib/components/ui/separator';

export default function HomePageContent() {
  const router = useRouter();

  useEffect(() => {
    const isSkipped = localStorage.getItem('loginIsSkipped');

    if (!isSkipped) {
      console.log('🔄 [HOME] Redirecting to onboarding');
      router.push('/onboarding');
    }
  }, [router]);

  useEffect(() => {
    const tabsContainer = document.getElementById('page-tabs');

    if (tabsContainer) {
      tabsContainer.scrollTo({
        left: 0,
        behavior: 'smooth',
      });
    }
  }, []);

  return (
    <div className="bg-[#74ACDF10] gradient-background md:!bg-white grow pb-8">
      <LoopingHeader />

      <WelcomeSection />

      <HighlightsContainer />
      <Separator className="mt-6 mb-0 mx-4 !w-auto" />
      <AnnouncementsWrapper />
      <TodaysSchedule />
      <PracticalInfo />
    </div>
  );
}
