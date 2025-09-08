'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import TabbedSection from '@/components/TabbedSection';
import DashboardImage from '@/images/hero.webp';
import Image from 'next/image';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';
// import { NAV_ITEMS } from '@/config/nav-items';

// const navItem = NAV_ITEMS.find((item) => item.href === '/');
// const navLabel = navItem?.label || 'Profile';
// const title = navLabel;

const tabs = [
  {
    label: 'Dashboard',
    component: () => (
      <div>
        <Image
          src={DashboardImage}
          alt="Dashboard"
          className="w-full h-full object-cover"
        />
      </div>
    ),
  },
];

export default function HomePage() {
  const router = useRouter();
  const { address } = useUnifiedConnection();

  useEffect(() => {
    const isSkipped = localStorage.getItem('loginIsSkipped');

    if (!isSkipped && address) {
      console.log('🔄 [HOME] Redirecting to onboarding');
      router.push('/onboarding');
    }
  }, [router, address]);

  // if (!address) {
  //   return <WalletTab />;
  // }

  return (
    <PageLayout title="Home 😎" tabs={tabs}>
      {/* <div className="w-full flex flex-col items-center py-8 pb-20 px-4">
        Welcome, John Smith, founder of Nethereum! 👋
      </div> */}
    </PageLayout>
  );
}
