'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import {
  WelcomeSection,
  TodaysSchedule,
  LoopingHeader,
} from './dashboard-sections';
import { homeTabs } from './navigation';

export default function HomePageContent() {
  const router = useRouter();

  useEffect(() => {
    const isSkipped = localStorage.getItem('loginIsSkipped');

    if (!isSkipped) {
      console.log('🔄 [HOME] Redirecting to onboarding');
      router.push('/onboarding');
    }
  }, [router]);

  return (
    <PageLayout title="Ethereum World's Fair - Dashboard" tabs={homeTabs()}>
      <div className="bg-[rgba(246,250,254,1)] grow pb-8">
        <LoopingHeader />
        <WelcomeSection />
        <TodaysSchedule />
      </div>
    </PageLayout>
  );
}
