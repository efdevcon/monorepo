'use client';
import TabBar from './TabBar';
import { NAV_ITEMS, TabItem } from '@/config/nav-items';
import SwipeableViews from 'react-swipeable-views-react-18-fix';
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
      <TabBar
        navItem={navItem}
        activeIndex={tabIndex}
        onTabClick={(_, idx) => setTabIndex(idx)}
      />
      <SwipeableViews
        index={tabIndex}
        onChangeIndex={setTabIndex}
        enableMouseEvents
        resistance
        style={{
          width: '100%',
          minHeight: 'calc(100vh - 182px)',
          paddingBottom: '88px',
        }}
      >
        {tabItems.map((tab, idx) => (
          <div key={tab.label} className="w-full py-8 text-center">
            {children(idx, tab)}
          </div>
        ))}
      </SwipeableViews>
    </>
  );
} 
