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
    <div className="bg-[#74ACDF10] md:!bg-white grow pb-8">
      <LoopingHeader />
      <WelcomeSection />
      <HighlightsContainer />
      <AnnouncementsWrapper />
      <TodaysSchedule />
      <PracticalInfo />
    </div>
  );
}
