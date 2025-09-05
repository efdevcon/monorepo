'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import PageLayout from '@/components/PageLayout';
import TabbedSection from '@/components/TabbedSection';
import QuestsTab from './QuestsTab';
import RewardsTab from './RewardsTab';
import LeaderboardTab from './LeaderboardTab';
import { NAV_ITEMS } from '@/config/nav-items';
import type { Quest as ApiQuest } from '@/types';

const navItem = NAV_ITEMS.find((item) => item.href === '/quests');
const navLabel = navItem?.label || 'Quests';
const title = navLabel;

// Quest states type
type QuestStates = Record<
  string,
  {
    status: 'completed' | 'active' | 'locked';
    is_locked: boolean;
    isCheckedIn?: boolean;
  }
>;

// Category-based tab configuration
const CATEGORY_TABS = [
  {
    id: 'onboarding-1',
    label: 'Onboarding Level 1',
    category: 'Onboarding level 1',
  },
  {
    id: 'onboarding-2',
    label: 'Onboarding Level 2',
    category: 'Onboarding level 2',
  },
  {
    id: 'onboarding-3',
    label: 'Onboarding Level 3',
    category: 'Onboarding level 3',
  },
  { id: 'defi', label: 'DeFi', category: 'Defi' },
  { id: 'l2s', label: 'L2s', category: 'L2s' },
  { id: 'social', label: 'Social', category: 'Social' },
  { id: 'rewards', label: 'Rewards', category: null },
  { id: 'leaderboard', label: 'Leaderboard', category: null },
];

export default function QuestsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [setTabIndex, setSetTabIndex] = useState<
    ((index: number) => void) | null
  >(null);
  const [isHandlingDeepLink, setIsHandlingDeepLink] = useState(false);

  // Local storage for quests data
  const [apiQuests, setApiQuests] = useLocalStorage<ApiQuest[]>(
    'quests-data',
    []
  );

  // Local storage for quest status and locked state
  const [questStates, setQuestStates] = useLocalStorage<QuestStates>(
    'quest-states',
    {}
  );

  // Ensure client-side rendering to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);

    // Debug: Check what's in localStorage
    const cachedQuests = localStorage.getItem('quests-data');
    const cachedStates = localStorage.getItem('quest-states');
    console.log('Cached quests:', cachedQuests);
    console.log('Cached quest states:', cachedStates);
  }, [apiQuests, questStates]);

  // Fetch quests from API on first load
  useEffect(() => {
    const fetchQuests = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/quests');
        const data = await response.json();

        if (data.success) {
          // Transform the quests to trim numbered prefixes from category, group, and difficulty
          const transformedQuests = data.quests.map((quest: any) => ({
            ...quest,
            category: quest.category.replace(/^\d+\.\s*/, ''), // Remove "1. ", "2. ", etc.
            group: quest.group.replace(/^\d+\.\s*/, ''), // Remove "1. ", "2. ", etc.
            difficulty: quest.difficulty.replace(/^\d+\.\s*/, ''), // Remove "1. ", "2. ", etc.
          }));

          setApiQuests(transformedQuests);
        } else {
          setError('Failed to fetch quests');
        }
      } catch (err) {
        setError('Error fetching quests');
        console.error('Error fetching quests:', err);
      } finally {
        setLoading(false);
      }
    };

    // Always fetch on first load
    fetchQuests();
  }, []); // Empty dependency array to only fetch once on mount

  // Function to update quest status
  const updateQuestStatus = (
    questId: string,
    status: 'completed' | 'active' | 'locked',
    is_locked: boolean,
    isCheckedIn?: boolean
  ) => {
    setQuestStates((prev) => ({
      ...prev,
      [questId]: {
        ...prev[questId],
        status,
        is_locked,
        ...(isCheckedIn !== undefined && { isCheckedIn }),
      },
    }));
  };

  // Function to update URL when tab changes
  const updateUrlForTab = useCallback(
    (tabIndex: number) => {
      console.log(`quest:🌐 updateUrlForTab called with index: ${tabIndex}`);
      console.log(`quest:🚫 isHandlingDeepLink: ${isHandlingDeepLink}`);
      console.log(`quest:🔍 Stack trace:`, new Error().stack);

      // Prevent URL updates during deep linking
      if (isHandlingDeepLink) {
        console.log('quest:🚫 Skipping URL update during deep link handling');
        return;
      }

      // Check if this is a SwipeableViews scroll event (not a manual tab click)
      const stackTrace = new Error().stack || '';
      const isSwipeableViewsEvent =
        stackTrace.includes('SwipeableViews') ||
        stackTrace.includes('handleScroll');

      // if (isSwipeableViewsEvent) {
      //   console.log(
      //     'quest:🚫 Skipping URL update - SwipeableViews scroll event'
      //   );
      //   return;
      // }

      const tab = CATEGORY_TABS[tabIndex];
      if (tab) {
        console.log(`quest:✅ Updating URL to #${tab.id}`);
        // Use pushState to avoid triggering hashchange event
        window.history.pushState(null, '', `#${tab.id}`);
      } else {
        console.log(`quest:❌ No tab found for index: ${tabIndex}`);
      }
    },
    [isHandlingDeepLink]
  );

  // Function to switch to any tab
  const switchToTab = useCallback(
    (tabIndex: number) => {
      console.log(`quest:🔄 switchToTab called with index: ${tabIndex}`);
      console.log(`quest:📊 setTabIndex available: ${!!setTabIndex}`);

      if (setTabIndex) {
        console.log(`quest:✅ Calling setTabIndex(${tabIndex})`);
        setTabIndex(tabIndex);
      } else {
        console.log(`quest:❌ setTabIndex not available`);
      }
    },
    [setTabIndex]
  );

  // Stable callback for setting the tab index function
  const handleTabIndexChange = useCallback(
    (setTabIndexFn: (index: number) => void) => {
      setSetTabIndex(() => setTabIndexFn);
    },
    []
  );

  // Function to find tab index from hash
  const findTabIndexFromHash = useCallback((hashValue: string) => {
    console.log('quest:🔍 Finding tab for hash:', hashValue);

    // Find a category that the hash starts with
    // For category hashes like "defi", find "defi"
    // For quest hashes like "onboarding-level-2-pay-with-crypto", find "onboarding-level-2"
    const categoryMatch = CATEGORY_TABS.findIndex((tab) => {
      const startsWith =
        hashValue.startsWith(tab.id + '-') || hashValue === tab.id;
      // console.log(
      //   `quest:🔍 Starts with check: "${hashValue}" starts with "${tab.id}-" or equals "${tab.id}" = ${startsWith}`
      // );
      return startsWith;
    });

    if (categoryMatch !== -1) {
      console.log(`quest:✅ Category match found at index: ${categoryMatch}`);
      return categoryMatch;
    }

    console.log('quest:❌ No match found');
    return -1;
  }, []);

  // Handle deep linking
  useEffect(() => {
    if (!isClient || !setTabIndex) return;

    const handleHashChange = () => {
      const hash = window.location.hash;
      console.log('quest:🔗 Processing hash:', hash);

      if (hash.startsWith('#')) {
        const hashValue = hash.substring(1);
        console.log('quest:📝 Hash value:', hashValue);

        const tabIndex = findTabIndexFromHash(hashValue);
        console.log('quest:🎯 Found tab index:', tabIndex);

        if (tabIndex !== -1) {
          console.log('quest:✅ Switching to tab:', tabIndex);
          setIsHandlingDeepLink(true);
          // Call setTabIndex directly to avoid triggering updateUrlForTab
          setTabIndex(tabIndex);
          // Reset the flag after a short delay to allow the tab switch to complete
          setTimeout(() => setIsHandlingDeepLink(false), 100);
        } else {
          console.log('quest:❌ No matching tab found');
        }
      }
    };

    // Handle initial load
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isClient, setTabIndex, findTabIndexFromHash]);

  // Also handle deep linking when setTabIndex becomes available
  useEffect(() => {
    if (isClient && setTabIndex) {
      const hash = window.location.hash;
      if (hash.startsWith('#')) {
        const hashValue = hash.substring(1);
        const tabIndex = findTabIndexFromHash(hashValue);

        if (tabIndex !== -1) {
          console.log('quest:🚀 Initial deep link: switching to tab', tabIndex);
          setIsHandlingDeepLink(true);
          setTabIndex(tabIndex);
          // Reset the flag after a short delay to allow the tab switch to complete
          setTimeout(() => setIsHandlingDeepLink(false), 100);
        }
      }
    }
  }, [isClient, setTabIndex, findTabIndexFromHash]);

  // TODO: The tab logic in this component was hard to wrap head around - simplification + alignment with rest of app attempted here but some functionality probably lost
  // Should consider handling deep linking in a generic manner (isolated to the Tab component, to isolate the complexity) if we want auto tab selection via url / deep linking
  // Left all code as is for now, although I commented out the previous rendering logic
  const tabs = [
    ...Array.from({ length: 6 }, (_, index) => ({
      label: CATEGORY_TABS[index].label,
      component: ({ activeIndex }: { activeIndex: number }) => {
        const category = CATEGORY_TABS[activeIndex]?.category;
        // console.log(`quests:tab🔍 activeIndex: ${activeIndex}`),

        console.log(`quests:tab🔍 category: ${category}`);

        if (!category) {
          return <div>No category</div>;
        }

        const apiQuestsForCategory = apiQuests.filter(
          (quest) => quest.category === category
        );

        return (
          <QuestsTab
            category={category}
            numberOfTabs={CATEGORY_TABS.length}
            apiQuests={apiQuestsForCategory}
            questStates={questStates}
            updateQuestStatus={updateQuestStatus}
            loading={loading}
            error={error}
            tabId={CATEGORY_TABS[index].id}
          />
        );
      },
    })),
    {
      label: 'Rewards',
      component: () => <RewardsTab />,
    },
    {
      label: 'Leaderboard',
      component: () => <LeaderboardTab />,
    },
  ];

  // Show loading only if not client-side yet
  if (!isClient) {
    return (
      <PageLayout title={title} tabs={tabs}>
        <div className="w-full max-w-2xl mx-auto flex flex-col justify-start items-start gap-3">
          <div className="text-center">Loading quests...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={title} tabs={tabs}>
      {/* <TabbedSection
        navLabel={navLabel}
        maxVisibleTabs={4}
        onTabIndexChange={(setTabIndexFn) => {
          // Set up the tab index function for deep linking (original function)
          handleTabIndexChange(setTabIndexFn);

          // Create a wrapper that also updates the URL for manual tab changes
          const wrappedSetTabIndex = (index: number) => {
            console.log(
              `quest:🎯 wrappedSetTabIndex called with index: ${index}`
            );
            console.log(`quest:🚫 isHandlingDeepLink: ${isHandlingDeepLink}`);

            // Prevent tab changes during deep linking
            if (isHandlingDeepLink) {
              console.log(
                'quest:🚫 Skipping tab change during deep link handling'
              );
              return;
            }

            setTabIndexFn(index);
            updateUrlForTab(index);
          };

          // Store the original function for deep linking
          setSetTabIndex(() => setTabIndexFn);
        }}
        onTabChange={updateUrlForTab}
        disableSwipe={isHandlingDeepLink}
      >
        {(tabIndex, tabItem) => {
          // Map tab index to the appropriate component
          if (tabIndex < 6) {
            // Quest category tabs (0-5)
            const category = CATEGORY_TABS[tabIndex]?.category;
            if (category) {
              return (
                <QuestsTab
                  apiQuests={apiQuests.filter(
                    (quest) => quest.category === category
                  )}
                  questStates={questStates}
                  updateQuestStatus={updateQuestStatus}
                  loading={loading && apiQuests.length === 0} // Only show loading if no cached data
                  error={error}
                  category={category}
                  onSwitchToTab={switchToTab}
                  numberOfTabs={CATEGORY_TABS.length}
                  tabId={CATEGORY_TABS[tabIndex]?.id}
                />
              );
            }
          } else if (tabIndex === 6) {
            // Rewards tab
            return <RewardsTab />;
          } else if (tabIndex === 7) {
            // Leaderboard tab
            return <LeaderboardTab />;
          }

          return <div>Not found</div>;
        }}
      </TabbedSection> */}
    </PageLayout>
  );
}
