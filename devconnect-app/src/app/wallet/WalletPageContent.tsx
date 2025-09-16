'use client';
import PageLayout from '@/components/PageLayout';
import { NAV_ITEMS, TabItem } from '@/config/nav-items';
import WalletTab from './WalletTab';
import TicketTab from './TicketTab';
import OnrampTab from './OnrampTab';
import DebugTab from './DebugTab';
import { useRouter, usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const navItem = NAV_ITEMS.find((item) => item.href === '/wallet');
const navLabel = navItem?.label || 'Wallet';

// Map tab labels to components
const tabComponents: Record<string, React.ComponentType> = {
  Wallet: WalletTab,
  Debug: DebugTab,
  Tickets: TicketTab,
  Onramp: OnrampTab,
};

// Create tabs from nav-items configuration
const createTabsFromNavItems = (tabItems: TabItem[]) => {
  return tabItems.map((tabItem) => ({
    label: tabItem.label,
    href: tabItem.href, // Include href for navigation
    component: () => {
      const Component = tabComponents[tabItem.label];
      return Component ? <Component /> : <div>Component not found for {tabItem.label}</div>;
    },
  }));
};

interface WalletPageContentProps {
  title?: string;
  showTabs?: boolean;
  activeTabHref?: string;
}

export default function WalletPageContent({ 
  title = navLabel, 
  showTabs = true, 
  activeTabHref 
}: WalletPageContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Get tabs from nav-items configuration
  const tabItems = navItem?.tabItems || [];
  const tabs = createTabsFromNavItems(tabItems);

  // Find active tab index based on current pathname
  const getActiveTabIndex = () => {
    if (activeTabHref) {
      return tabItems.findIndex(tab => tab.href === activeTabHref);
    }
    return tabItems.findIndex(tab => pathname === tab.href);
  };

  // Update active index when pathname changes
  useEffect(() => {
    const newIndex = getActiveTabIndex();
    if (newIndex !== -1) {
      setActiveIndex(newIndex);
    }
  }, [pathname, activeTabHref]);

  // Handle tab navigation - navigate to URL instead of changing local state
  const handleTabClick = useCallback((tabItem: TabItem, index: number) => {
    if (tabItem.href) {
      router.push(tabItem.href);
    }
  }, [router]);

  if (showTabs) {
    return (
      <PageLayout 
        title={title} 
        tabs={tabs}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
        onTabClick={handleTabClick}
      />
    );
  }

  // For individual tab pages, show only the specific component
  const getTabComponent = () => {
    const currentTab = tabItems.find(tab => tab.href === activeTabHref || pathname === tab.href);
    if (currentTab) {
      const Component = tabComponents[currentTab.label];
      return Component ? <Component /> : <div>Component not found for {currentTab.label}</div>;
    }
    return <WalletTab />; // Default fallback
  };

  return (
    <PageLayout title={title}>
      {getTabComponent()}
    </PageLayout>
  );
}
