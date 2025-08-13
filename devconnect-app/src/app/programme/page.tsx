'use client';

import { useState } from 'react';
import PageLayout from '@/components/PageLayout';
import TabbedSection from '@/components/TabbedSection';
import ScheduleTab from './ScheduleTab';
import WorldsFairTab from './WorldsFairTab';
import FavoritesTab from './FavoritesTab';
import { NAV_ITEMS } from '@/config/nav-items';

const navItem = NAV_ITEMS.find((item) => item.href === '/programme');
const navLabel = navItem?.label || 'Programme';
const title = navLabel;

const tabComponents = [ScheduleTab, WorldsFairTab, FavoritesTab];

export default function ProgrammePage() {
  const [currentTabIndex, setCurrentTabIndex] = useState(0);

  return (
    <PageLayout title={title}>
      <TabbedSection
        navLabel={navLabel}
        disableSwipe={currentTabIndex === 0}
        onTabChange={setCurrentTabIndex}
      >
        {(tabIndex, tabItem) => {
          const TabComponent =
            tabComponents[tabIndex] || (() => <div>Not found</div>);
          return <TabComponent />;
        }}
      </TabbedSection>
    </PageLayout>
  );
}
