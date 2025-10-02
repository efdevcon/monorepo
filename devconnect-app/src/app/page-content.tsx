'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';
import { WelcomeSection, TodaysSchedule } from './dashboard-sections';

const tabs = (atprotoEvents: any[]) => [
  {
    label: 'Dashboard',
    component: () => (
      <div className="bg-[rgba(246,250,254,1)] p-4">
        <WelcomeSection />
        <TodaysSchedule atprotoEvents={atprotoEvents} />
      </div>
    ),
  },
];

export default function HomePageContent({
  atprotoEvents,
}: {
  atprotoEvents: any[];
}) {
  const router = useRouter();
  const { address } = useUnifiedConnection();

  console.log('🔄 [HOME] atprotoEvents', atprotoEvents);
  useEffect(() => {
    const isSkipped = localStorage.getItem('loginIsSkipped');

    if (!isSkipped && address) {
      console.log('🔄 [HOME] Redirecting to onboarding');
      router.push('/onboarding');
    }
  }, [router, address]);

  return <PageLayout title="Home 😎" tabs={tabs(atprotoEvents)} />;
}
