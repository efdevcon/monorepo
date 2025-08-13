'use client';

import QuestItem from '@/components/QuestItem';
import QuestRecap from '@/components/QuestRecap';
import QuestReward from '@/components/QuestReward';
import QuestLeaderboard from '@/components/QuestLeaderboard';
import type { Quest as ApiQuest, ComponentQuest } from '@/types';

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
): ComponentQuest => {
  return {
    ...apiQuest,
    state: questState,
  };
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
}: QuestsTabProps) {
  // Transform API quests to component quests with status from props
  const componentQuests: ComponentQuest[] = apiQuests.map((apiQuest) => {
    const savedState = questStates[apiQuest.id] || {
      status: 'locked' as const,
      is_locked: true,
      isCheckedIn: false,
    };

    return transformApiQuestToComponentQuest(apiQuest, savedState);
  });

  // Handle quest completion
  const handleQuestComplete = (questId: string) => {
    updateQuestStatus(questId, 'completed', false);
  };

  // Handle quest check-in
  const handleQuestCheckIn = (questId: string) => {
    updateQuestStatus(questId, 'active', false, true);
  };

  // Handle reset all quest states
  const handleResetStates = () => {
    // Reset all quests to locked state
    apiQuests.forEach((quest) => {
      updateQuestStatus(quest.id, 'locked', true);
    });
  };

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
          onQuestCheckIn={handleQuestCheckIn}
        />
      ))}
      <div className="w-[95px] h-0 border border-[#d2d2de] my-4 mx-auto" />
      <div
        className="w-full cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => {
          // load rewards tab (second to last tab)
          onSwitchToTab?.(numberOfTabs - 2);
        }}
      >
        <QuestReward />
      </div>
      <div
        className="w-full cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => {
          // load leaderboard tab (last tab)
          onSwitchToTab?.(numberOfTabs - 1);
        }}
      >
        <QuestLeaderboard />
      </div>
    </div>
  );
}
