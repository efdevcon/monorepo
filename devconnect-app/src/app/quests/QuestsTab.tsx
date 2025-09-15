'use client';

import { useState, useEffect } from 'react';
import QuestItem from '@/components/QuestItem';
import QuestRecap from '@/components/QuestRecap';
import QuestReward from '@/components/QuestReward';
import QuestLeaderboard from '@/components/QuestLeaderboard';
import type { Quest as ApiQuest, ComponentQuest } from '@/types';

// Extended ComponentQuest interface that includes category and group
interface ExtendedComponentQuest extends ComponentQuest {
  category: string;
}

// Quest states type
type QuestStates = Record<
  string,
  {
    status: 'completed' | 'active' | 'locked';
    is_locked: boolean;
    isCheckedIn?: boolean;
  }
>;

// Transform API quest data to match the ComponentQuest interface
const transformApiQuestToComponentQuest = (
  apiQuest: ApiQuest,
  questState: {
    status: 'completed' | 'active' | 'locked';
    is_locked: boolean;
    isCheckedIn?: boolean;
  }
): ExtendedComponentQuest => {
  if (!(apiQuest as any).category) {
    throw new Error(`Quest ${apiQuest.id} is missing category field`);
  }

  return {
    ...apiQuest,
    category: (apiQuest as any).category,
    state: questState,
  };
};

// Generate quest deep link ID
const getQuestDeepLinkId = (quest: ApiQuest): string => {
  const category = (quest as any).category
    ?.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '-');
  const name = quest.name
    ?.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '-');

  return `${category}-${name}`;
};

interface QuestsTabProps {
  apiQuests: ApiQuest[];
  questStates: QuestStates;
  updateQuestStatus: (
    questId: string,
    status: 'completed' | 'active' | 'locked',
    is_locked: boolean,
    isCheckedIn?: boolean
  ) => void;
  loading: boolean;
  error: string | null;
  category?: string;
  onSwitchToTab?: (tabIndex: number) => void;
  numberOfTabs: number;
  tabId?: string; // Add tabId prop to get the correct category ID
}

export default function QuestsTab({
  apiQuests,
  questStates,
  updateQuestStatus,
  loading,
  error,
  category,
  onSwitchToTab,
  numberOfTabs,
  tabId,
}: QuestsTabProps) {
  // State for selected and expanded quest
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [expandedQuestId, setExpandedQuestId] = useState<string | null>(null);
  const [isHandlingDeepLink, setIsHandlingDeepLink] = useState(false);

  // Transform API quests to component quests with status from props
  const componentQuests: ExtendedComponentQuest[] = apiQuests.map(
    (apiQuest) => {
      const savedState = questStates[apiQuest.id.toString()] || {
        status: 'locked' as const,
        is_locked: true,
        isCheckedIn: false,
      };

      return transformApiQuestToComponentQuest(apiQuest, savedState);
    }
  );

  // Handle quest completion
  const handleQuestComplete = (questId: string) => {
    updateQuestStatus(questId, 'completed', false);
  };

  // Handle reset all quest states
  const handleResetStates = () => {
    // Reset all quests to locked state
    apiQuests.forEach((quest) => {
      updateQuestStatus(quest.id.toString(), 'locked', true);
    });
  };

  // Handle quest selection and expansion
  const handleQuestSelect = (questId: string, isExpanded: boolean) => {
    console.log(
      `quests:tab🎯 Quest selected: ${questId}, expanded: ${isExpanded}`
    );

    setSelectedQuestId(questId);
    setExpandedQuestId(isExpanded ? questId : null);

    // Update URL based on expansion state
    const quest = componentQuests.find((q) => q.id.toString() === questId);
    if (quest) {
      if (isExpanded) {
        // Expanded: #category-quest
        const questDeepLinkId = getQuestDeepLinkId(quest);
        console.log(
          `quests:tab🔄 Quest expanded: Updating URL to #${questDeepLinkId}`
        );
        window.history.replaceState(null, '', `#${questDeepLinkId}`);
      } else {
        // Collapsed: #category
        const categoryId =
          tabId ||
          category
            ?.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '-');
        console.log(
          `quests:tab🔄 Quest collapsed: Updating URL to #${categoryId}`
        );
        window.history.replaceState(null, '', `#${categoryId}`);
      }
    } else {
      console.log(`quests:tab❌ Quest not found: ${questId}`);
    }
  };

  // Handle deep linking
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      console.log(`quests:tab🔗 Processing hash: ${hash}`);

      if (!hash.startsWith('#')) return;

      const hashValue = hash.substring(1);
      console.log(`quests:tab📝 Hash value: ${hashValue}`);

      const categoryId =
        tabId ||
        category
          ?.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '-');

      console.log(
        `quests:tab🏷️ Current category: ${category}, categoryId: ${categoryId}`
      );

      // Check if hash starts with current category
      if (categoryId && hashValue.startsWith(categoryId)) {
        console.log(`quests:tab✅ Hash starts with current category`);
        setIsHandlingDeepLink(true);
        console.log(`quests:tab🚫 Set isHandlingDeepLink = true`);

        if (hashValue === categoryId) {
          // #category - category level deep link
          console.log(`quests:tab📋 Category deep link: ${hashValue}`);
          setSelectedQuestId(null);
          setExpandedQuestId(null);
        } else {
          // #category-quest - quest specific deep link
          console.log(`quests:tab🎯 Quest deep link: ${hashValue}`);
          const matchingQuest = componentQuests.find((quest) => {
            const questDeepLinkId = getQuestDeepLinkId(quest);
            console.log(
              `quests:tab🔍 Comparing "${questDeepLinkId}" with "${hashValue}"`
            );
            return questDeepLinkId === hashValue;
          });

          if (matchingQuest) {
            console.log(
              `quests:tab✅ Found matching quest: ${matchingQuest.name}`
            );

            // Only update if the quest is not already selected and expanded
            if (
              selectedQuestId !== matchingQuest.id.toString() ||
              expandedQuestId !== matchingQuest.id.toString()
            ) {
              setSelectedQuestId(matchingQuest.id.toString());
              setExpandedQuestId(matchingQuest.id.toString());
            } else {
              console.log(
                `quests:tab✅ Quest already selected and expanded, skipping update`
              );
            }
          } else {
            console.log(`quests:tab❌ No matching quest found`);
          }
        }

        // Reset flag after a short delay
        setTimeout(() => {
          console.log(`quests:tab🔄 Reset isHandlingDeepLink = false`);
          setIsHandlingDeepLink(false);
        }, 100);
      } else {
        console.log(`quests:tab❌ Hash doesn't start with current category`);
      }
    };

    // Only run if we have quests and category
    if (componentQuests.length === 0 || !category) {
      return;
    }

    // Handle initial load
    console.log(`quests:tab🚀 Initial hash handler`);
    handleHashChange();

    // Listen for hash changes
    console.log(`quests:tab👂 Setting up hash change listener`);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      console.log(`quests:tab🧹 Cleaning up hash change listener`);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [category, tabId]); // Remove componentQuests from dependencies

  // Update URL to category when tab is opened (if no hash or wrong hash)
  useEffect(() => {
    console.log(
      `quests:tab🔄 URL update effect triggered for category: ${category}, tabId: ${tabId}`
    );
    console.log(
      `quests:tab📊 category: ${category}, isHandlingDeepLink: ${isHandlingDeepLink}`
    );

    if (!category || isHandlingDeepLink) {
      console.log(
        `quests:tab🚫 Skipping URL update - no category or handling deep link`
      );
      return;
    }

    const hash = window.location.hash;
    console.log(`quests:tab🔗 Current hash: ${hash}`);

    const categoryId =
      tabId ||
      category
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '-');

    console.log(`quests:tab🏷️ Expected categoryId: ${categoryId}`);

    // Only allow URL updates if this tab is currently active (hash starts with this category)
    const isActiveTab = hash.startsWith(`#${categoryId}`);
    if (!isActiveTab) {
      console.log(`quests:tab🚫 Not active tab, skipping URL update`);
      return;
    }

    if (!hash || hash === `#${categoryId}`) {
      // No hash or already correct category hash
      console.log(`quests:tab✅ Hash is correct or empty, no update needed`);
      return;
    }

    const hashValue = hash.substring(1);
    console.log(`quests:tab📝 Hash value to check: ${hashValue}`);

    // Check if hash is for a quest in this category
    const hasQuestInCategory = componentQuests.some((quest) => {
      const questDeepLinkId = getQuestDeepLinkId(quest);
      return questDeepLinkId === hashValue;
    });
    console.log(`quests:tab🔍 hasQuestInCategory: ${hasQuestInCategory}`);

    // Also check if the hash matches the category ID (case-insensitive)
    const hashMatchesCategory =
      hashValue.toLowerCase() === categoryId.toLowerCase();
    console.log(`quests:tab🔍 Hash matches category: ${hashMatchesCategory}`);

    if (!hasQuestInCategory && !hashMatchesCategory) {
      // Hash doesn't match this category and doesn't match any quest in this category
      console.log(
        `quests:tab🔄 [${category}] Updating URL to category: #${categoryId}`
      );
      window.history.replaceState(null, '', `#${categoryId}`);
    } else {
      console.log(
        `quests:tab✅ Hash is valid for this category, no update needed`
      );
    }
  }, [category, componentQuests, isHandlingDeepLink, tabId]);

  if (loading && apiQuests.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto flex flex-col justify-start items-start gap-3">
        <div className="text-center">Loading quests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto flex flex-col justify-start items-start gap-3">
        <div className="text-center text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col justify-start items-start gap-3">
      <QuestRecap quests={componentQuests} onResetStates={handleResetStates} />
      {componentQuests.map((quest, index) => (
        <QuestItem
          key={quest.id || `quest-item-${index}`}
          quest={quest}
          onQuestComplete={handleQuestComplete}
          isSelected={selectedQuestId === quest.id.toString()}
          isExpanded={expandedQuestId === quest.id.toString()}
          onQuestSelect={handleQuestSelect}
        />
      ))}
      <div className="w-[95px] h-0 border border-[#d2d2de] my-4 mx-auto" />
      <div
        className="w-full cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => {
          console.log(
            `quests:tab🎁 QuestReward clicked, switching to tab ${numberOfTabs - 2}`
          );
          // load rewards tab (second to last tab)
          onSwitchToTab?.(numberOfTabs - 2);
        }}
      >
        <QuestReward />
      </div>
      <div
        className="w-full cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => {
          console.log(
            `quests:tab🏆 QuestLeaderboard clicked, switching to tab ${numberOfTabs - 1}`
          );
          // load leaderboard tab (last tab)
          onSwitchToTab?.(numberOfTabs - 1);
        }}
      >
        <QuestLeaderboard />
      </div>
    </div>
  );
}
