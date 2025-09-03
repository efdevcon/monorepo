'use client';
import PageLayout from '@/components/PageLayout';
import TabbedSection from '@/components/TabbedSection';
import WalletTab from './WalletTab';
import TicketTab from './TicketTab';
import OnrampTab from './OnrampTab';
import { NAV_ITEMS } from '@/config/nav-items';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';

const navItem = NAV_ITEMS.find((item) => item.href === '/');
const navLabel = navItem?.label || 'Profile';
const title = navLabel;

const tabComponents = [WalletTab, OnrampTab, TicketTab];

export default function HomePage() {
  const { address } = useUnifiedConnection();
  if (!address) {
    return <WalletTab />;
  }
  return (
    <PageLayout title={title}>
      <TabbedSection navLabel={navLabel}>
        {(tabIndex) => {
          const TabComponent =
            tabComponents[tabIndex] || (() => <div>Not found</div>);
          return <TabComponent />;
        }}
      </TabbedSection>
    </PageLayout>
  );
}
