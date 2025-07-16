'use client';
import TabBar from './TabBar';
import { NAV_ITEMS, TabItem } from '@/utils/nav-items';
import SwipeableViews from 'react-swipeable-views';
import { useState } from 'react';

interface TabbedSectionProps {
  navLabel: string;
  children: (tabIndex: number, tabItem: TabItem) => React.ReactNode;
}

export default function TabbedSection({ navLabel, children }: TabbedSectionProps) {
  const navItem = NAV_ITEMS.find(item => item.label === navLabel);
  const tabItems = navItem?.tabItems || [];
  const [tabIndex, setTabIndex] = useState(0);

  if (!navItem || tabItems.length === 0) {
    return null;
  }

  return (
    <>
      <TabBar navItem={navItem} activeIndex={tabIndex} onTabClick={(_, idx) => setTabIndex(idx)} />
      <SwipeableViews
        index={tabIndex}
        onChangeIndex={setTabIndex}
        enableMouseEvents
        resistance
        style={{ width: '100%' }}
      >
        {tabItems.map((tab, idx) => (
          <div key={tab.label} style={{ width: '100%', minHeight: '100vh' }} className="py-8 text-center">
            {children(idx, tab)}
          </div>
        ))}
      </SwipeableViews>
    </>
  );
} 
