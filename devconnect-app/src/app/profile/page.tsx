'use client';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import TabbedSection from '@/components/TabbedSection';
import { NAV_ITEMS } from '@/config/nav-items';
import Button from 'lib/components/voxel-button/button';
import WalletTab from '../onboarding/WalletTab';
import TicketTab from './TicketTab';
import OnrampTab from './OnrampTab';

const navItem = NAV_ITEMS.find((item) => item.href === '/profile');
const navLabel = navItem?.label || 'Sign up';
const title = navLabel;

const tabs = [
  // {
  //   label: 'Wallet',
  //   component: () => <WalletTab />,
  // },
  {
    label: 'Ticket',
    component: () => <TicketTab />,
  },
  {
    label: 'Onramp',
    component: () => <OnrampTab />,
  },
  // () => {
  //   const router = useRouter();

  //   const handleSkip = () => {
  //     localStorage.setItem('loginIsSkipped', 'true');
  //     router.push('/');
  //   };

  //   return (
  //     <div className="flex flex-col items-center justify-center h-screen">
  //       Sign up flow will go here
  //       <Button
  //         onClick={handleSkip}
  //         style={{ marginTop: '20px', display: 'block' }}
  //       >
  //         Skip
  //       </Button>
  //     </div>
  //   );
  // },
  // WalletTab,
  // TicketTab,
  // OnrampTab,
];

export default function HomePage() {
  return <PageLayout title={title} tabs={tabs}></PageLayout>;
}
