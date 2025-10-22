'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import {
  WelcomeSection,
  TodaysSchedule,
  LoopingHeader,
} from './dashboard-sections';
import Announcements from '@/components/Announcements';
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
      <div className="bg-[rgba(246,250,254,1)] grow pb-8">
        <LoopingHeader />
        <WelcomeSection />
        <Announcements />
        <TodaysSchedule />
      </div>
    </PageLayout>
  );
}
