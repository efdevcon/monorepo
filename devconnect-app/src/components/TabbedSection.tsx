'use client';
import TabBar from './TabBar';
import { NAV_ITEMS, TabItem } from '@/config/nav-items';
import SwipeableViews from 'react-swipeable-views-react-18-fix';
import { useState, useRef, useEffect, useCallback } from 'react';

interface TabbedSectionProps {
  navLabel: string;
  children: (tabIndex: number, tabItem: TabItem) => React.ReactNode;
  maxVisibleTabs?: number; // Maximum tabs to show before scrolling
  onTabChange?: (tabIndex: number) => void; // Callback when tab changes
  onTabIndexChange?: (setTabIndex: (index: number) => void) => void; // Callback to expose setTabIndex
  disableSwipe?: boolean; // Disable swipe functionality
}

export default function TabbedSection({
  navLabel,
  children,
  maxVisibleTabs = 6,
  onTabChange,
  onTabIndexChange,
  disableSwipe = false,
}: TabbedSectionProps) {
  const navItem = NAV_ITEMS.find((item) => item.label === navLabel);
  const tabItems = navItem?.tabItems || [];
  const [tabIndex, setTabIndex] = useState(0);
  const [showScrollArrows, setShowScrollArrows] = useState(false);
  const tabBarRef = useRef<HTMLDivElement>(null);

  // Expose setTabIndex to parent component - only call once on mount
  useEffect(() => {
    if (onTabIndexChange) {
      onTabIndexChange(setTabIndex);
    }
  }, []); // Empty dependency array to only call once

  // Check if we need scroll arrows based on tab count
  useEffect(() => {
    setShowScrollArrows(tabItems.length > maxVisibleTabs);
  }, [tabItems.length, maxVisibleTabs]);

  // Handle tab index changes - use useCallback to prevent unnecessary re-renders
  const handleTabChange = useCallback(
    (newIndex: number) => {
      setTabIndex(newIndex);
      onTabChange?.(newIndex);
    },
    [onTabChange]
  );

  if (!navItem || tabItems.length === 0) {
    return null;
  }

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        handleTabChange(Math.max(0, tabIndex - 1));
        break;
      case 'ArrowRight':
        event.preventDefault();
        handleTabChange(Math.min(tabItems.length - 1, tabIndex + 1));
        break;
      case 'Home':
        event.preventDefault();
        handleTabChange(0);
        break;
      case 'End':
        event.preventDefault();
        handleTabChange(tabItems.length - 1);
        break;
    }
  };

  // Scroll to active tab if needed
  const scrollToActiveTab = () => {
    if (tabBarRef.current) {
      const activeTab = tabBarRef.current.querySelector(
        `[data-tab-index="${tabIndex}"]`
      ) as HTMLElement;
      if (activeTab) {
        activeTab.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  };

  useEffect(() => {
    scrollToActiveTab();
  }, [tabIndex]);

  return (
    <div className="section mx-auto" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Enhanced TabBar with scrolling support */}
      <div className="relative max-w-[100vw]">
        {showScrollArrows && (
          <>
            {/* Left scroll arrow */}
            <button
              onClick={() => handleTabChange(Math.max(0, tabIndex - 1))}
              disabled={tabIndex === 0}
              className="absolute left-1 top-3 z-10 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full border border-gray-400 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/90 transition-all cursor-pointer"
              aria-label="Previous tab"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            {/* Right scroll arrow */}
            <button
              onClick={() =>
                handleTabChange(Math.min(tabItems.length - 1, tabIndex + 1))
              }
              disabled={tabIndex === tabItems.length - 1}
              className="absolute right-1 top-3 z-10 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full border border-gray-400 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/90 transition-all cursor-pointer"
              aria-label="Next tab"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        <div
          ref={tabBarRef}
          className={`${showScrollArrows ? 'mx-10' : 'flex'} overflow-x-auto scrollbar-hide`}
        >
          <TabBar
            navItem={navItem}
            activeIndex={tabIndex}
            onTabClick={(_, idx) => handleTabChange(idx)}
            showScrollArrows={showScrollArrows}
          />
        </div>
      </div>

      {/* Tab indicator showing current position */}
      {showScrollArrows && (
        <div className="flex justify-center mt-2 mb-1">
          <div className="flex space-x-1">
            {tabItems.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-all duration-200 cursor-pointer ${
                  idx === tabIndex ? 'bg-blue-500' : 'bg-gray-300'
                }`}
                onClick={() => handleTabChange(idx)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Enhanced SwipeableViews with better performance */}
      {disableSwipe ? (
        // Static view when swipe is disabled
        <div
          style={{
            width: '100%',
            minHeight: 'auto',
            paddingBottom: '88px',
          }}
        >
          {tabItems.map((tab, idx) => (
            <div
              key={tab.label}
              className="w-full py-8 text-center"
              data-tab-index={idx}
              style={{ display: idx === tabIndex ? 'block' : 'none' }}
            >
              {children(idx, tab)}
            </div>
          ))}
        </div>
      ) : (
        // SwipeableViews when swipe is enabled
        <SwipeableViews
          index={tabIndex}
          onChangeIndex={handleTabChange}
          enableMouseEvents
          resistance
          style={{
            width: '100%',
            minHeight: 'auto',
            paddingBottom: '88px',
          }}
        >
          {tabItems.map((tab, idx) => (
            <div
              key={tab.label}
              className="w-full py-8 text-center"
              data-tab-index={idx}
            >
              {children(idx, tab)}
            </div>
          ))}
        </SwipeableViews>
      )}

      {/* Keyboard navigation hint for many tabs */}
      {/* {tabItems.length > 4 && (
        <div className="text-center text-xs text-gray-500 mt-2 px-4">
          <span>
            Use ← → arrow keys to navigate, Home/End for first/last tab
          </span>
        </div>
      )} */}
    </div>
  );
}
