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
  { status: 'completed' | 'active' | 'locked'; is_locked: boolean }
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
    is_locked: boolean
  ) => {
    setQuestStates((prev) => ({
      ...prev,
      [questId]: { status, is_locked },
    }));
  };

  // Function to switch to any tab - use useCallback to prevent unnecessary re-renders
  const switchToTab = useCallback(
    (tabIndex: number) => {
      if (setTabIndex) {
        setTabIndex(tabIndex);
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

  // Show loading only if not client-side yet
  if (!isClient) {
    return (
      <PageLayout title={title}>
        <div className="w-full max-w-2xl mx-auto flex flex-col justify-start items-start gap-3">
          <div className="text-center">Loading quests...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={title}>
      <TabbedSection
        navLabel={navLabel}
        maxVisibleTabs={4}
        onTabIndexChange={handleTabIndexChange}
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
      </TabbedSection>
    </PageLayout>
  );
}
