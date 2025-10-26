'use client';
import PageLayout from '@/components/PageLayout';
import { NAV_ITEMS, TabItem } from '@/config/nav-items';
import WalletTab from './WalletTab';
import OnrampTab from './OnrampTab';
import StampbookTab from './StampbookTab';
import DebugTab from './DebugTab';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import React from 'react';
import SettingsTab from './SettingsTab';
import SendSubTab from './SendSubTab';

const navItem = NAV_ITEMS.find((item) => item.href === '/wallet');
const navLabel = navItem?.label || 'Wallet';
const tabItems = navItem?.tabItems || [];

// Map tab labels to components
const tabComponents: Record<string, React.ComponentType<any>> = {
  Wallet: WalletTab,
  Onramp: OnrampTab,
  Stampbook: StampbookTab,
  Debug: DebugTab,
  Settings: SettingsTab,
  Send: SendSubTab,
};

interface WalletPageContentProps {
  title?: string;
  showTabs?: boolean;
}

export default function WalletPageContent({
  title = navLabel,
  showTabs = true,
}: WalletPageContentProps) {
  const pathname = usePathname();

  // Create tabs with isActive function for proper detection
  const tabs = useMemo(
    () =>
      tabItems
        .filter((tab) => !tab.hide || pathname === tab.href) // Show hidden tabs when on their route
        .map((tabItem) => ({
          label: tabItem.label,
          href: tabItem.href,
          labelIcon: tabItem.icon,
          component: tabComponents[tabItem.label] || WalletTab,
          isActive: (currentPath: string) => currentPath === tabItem.href,
        })),
    [pathname]
  );

  // Find active tab index for PageLayout (needed to render correct component)
  const activeIndex = tabs.findIndex((tab) => tab.isActive(pathname));

  // Get the component for the current route (for non-tabbed pages)
  const currentTabItem = tabItems.find((tab) => tab.href === pathname);
  const CurrentComponent = currentTabItem
    ? tabComponents[currentTabItem.label]
    : WalletTab;

  return (
    <PageLayout
      title={title}
      tabs={showTabs ? tabs : []}
      activeIndex={activeIndex !== -1 ? activeIndex : 0}
    >
      {/* Only render children when showTabs is false to avoid duplication with tab.component */}
      {!showTabs && CurrentComponent && <CurrentComponent />}
    </PageLayout>
  );
}
