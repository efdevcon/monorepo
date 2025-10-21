'use client';
import PageLayout from '@/components/PageLayout';
import { NAV_ITEMS, TabItem } from '@/config/nav-items';
import WalletTab from './WalletTab';
import OnrampTab from './OnrampTab';
import StampbookTab from './StampbookTab';
import DebugTab from './DebugTab';
import { useRouter, usePathname } from 'next/navigation';
import { useCallback, useEffect, useState, useMemo } from 'react';
import React from 'react';
import SettingsTab from './SettingsTab';

const navItem = NAV_ITEMS.find((item) => item.href === '/wallet');
const navLabel = navItem?.label || 'Wallet';

// Map tab labels to components
const tabComponents: Record<string, React.ComponentType<any>> = {
  Wallet: WalletTab as React.ComponentType<any>,
  Onramp: OnrampTab as React.ComponentType<any>,
  Stampbook: StampbookTab as React.ComponentType<any>,
  Debug: DebugTab as React.ComponentType<any>,
  Settings: SettingsTab as React.ComponentType<any>,
};

// Create tabs from nav-items configuration
const createTabsFromNavItems = (
  tabItems: TabItem[]
): Array<{
  label: string;
  href?: string;
  hide?: boolean;
  labelIcon?: React.ComponentType<any>;
  component: React.ComponentType<any>;
}> => {
  return tabItems.map((tabItem) => ({
    label: tabItem.label,
    href: tabItem.href, // Include href for navigation
    hide: tabItem.hide,
    labelIcon: tabItem.icon, // Pass the icon to be used as labelIcon in PageLayout
    component:
      tabComponents[tabItem.label] ||
      ((() => (
        <div>Component not found for {tabItem.label}</div>
      )) as React.ComponentType<any>),
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
  activeTabHref,
}: WalletPageContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeIndex, setActiveIndex] = useState(0);

  // Get tabs from nav-items configuration
  const tabItems = navItem?.tabItems || [];
  const tabs = useMemo(() => createTabsFromNavItems(tabItems), [tabItems]);

  // Find active tab index based on current pathname
  const getActiveTabIndex = () => {
    if (activeTabHref) {
      return tabItems.findIndex((tab) => tab.href === activeTabHref);
    }
    return tabItems.findIndex((tab) => pathname === tab.href);
  };

  // Update active index when pathname changes
  useEffect(() => {
    const newIndex = getActiveTabIndex();
    if (newIndex !== -1) {
      setActiveIndex(newIndex);
    }
  }, [pathname, activeTabHref]);

  // Handle tab navigation - navigate to URL instead of changing local state
  const handleTabClick = useCallback(
    (tabItem: TabItem, index: number) => {
      if (tabItem.href) {
        router.push(tabItem.href);
      }
    },
    [router]
  );

  if (showTabs) {
    return (
      <PageLayout
        title={title}
        tabs={tabs?.filter((tab) => !tab?.hide)}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
        onTabClick={handleTabClick}
      />
    );
  }

  // For individual tab pages, show only the specific component
  const getTabComponent = useCallback(() => {
    const currentTab = tabItems.find(
      (tab) => tab.href === activeTabHref || pathname === tab.href
    );
    if (currentTab) {
      const Component = tabComponents[currentTab.label];
      return Component ? (
        <Component />
      ) : (
        <div>Component not found for {currentTab.label}</div>
      );
    }
    return <WalletTab />; // Default fallback
  }, [tabItems, activeTabHref, pathname]);

  return <PageLayout>{getTabComponent()}</PageLayout>;
}
