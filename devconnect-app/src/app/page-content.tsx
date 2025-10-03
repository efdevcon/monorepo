'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';
import { WelcomeSection, TodaysSchedule } from './dashboard-sections';
import { HomeIcon, CalendarIcon, TicketIcon } from 'lucide-react';

export const homeTabs = () => [
  {
    label: 'Home',
    labelIcon: HomeIcon,
    href: '/',
    component: () => null,
    isActive: (pathname: string) => pathname === '/',
  },
  {
    label: 'Schedule',
    labelIcon: CalendarIcon,
    href: '/schedule',
    component: () => null,
    isActive: (pathname: string) => pathname === '/schedule',
  },
  {
    label: 'Tickets',
    labelIcon: TicketIcon,
    href: '/tickets',
    component: () => null,
    isActive: (pathname: string) => pathname === '/tickets',
  },
];

export default function HomePageContent({
  atprotoEvents,
}: {
  atprotoEvents: any[];
}) {
  // const router = useRouter();
  // const { address } = useUnifiedConnection();

  // useEffect(() => {
  //   const isSkipped = localStorage.getItem('loginIsSkipped');

  //   if (!isSkipped && address) {
  //     console.log('🔄 [HOME] Redirecting to onboarding');
  //     router.push('/onboarding');
  //   }
  // }, [router, address]);

  return (
    <PageLayout title="Ethereum World's Fair" tabs={homeTabs()}>
      <div className="bg-[rgba(246,250,254,1)] p-4 grow">
        <WelcomeSection />
        <TodaysSchedule atprotoEvents={atprotoEvents} />
      </div>
    </PageLayout>
  );
}
