'use client';

import QuestItem, { Quest } from '@/components/QuestItem';
import QuestRecap from '@/components/QuestRecap';
import QuestReward from '@/components/QuestReward';
import QuestLeaderboard from '@/components/QuestLeaderboard';
import type { Quest as ApiQuest } from '@/types';

// Extended Quest interface that includes status and is_locked
interface ExtendedQuest extends Omit<Quest, 'quest_id'> {
  quest_id: string;
  status: 'completed' | 'active' | 'locked';
  is_locked: boolean;
}

// Quest states type
type QuestStates = Record<
  string,
  { status: 'completed' | 'active' | 'locked'; is_locked: boolean }
>;

// Transform API quest data to match the component's Quest interface
const transformApiQuestToComponentQuest = (
  apiQuest: ApiQuest
): ExtendedQuest => {
  return {
    number: apiQuest.order,
    quest_id: apiQuest.id,
    title: apiQuest.name,
    description: apiQuest.instructions,
    points: apiQuest.points,
    action: apiQuest.button,
    status: 'locked' as const, // Default status, will be overridden by props
    is_locked: true, // Default locked state, will be overridden by props
  };
};

interface QuestsTabProps {
  apiQuests: ApiQuest[];
  questStates: QuestStates;
  updateQuestStatus: (
    questId: string,
    status: 'completed' | 'active' | 'locked',
    is_locked: boolean
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
  const componentQuests: ExtendedQuest[] = apiQuests.map((apiQuest) => {
    const savedState = questStates[apiQuest.id];
    const transformedQuest = transformApiQuestToComponentQuest(apiQuest);

    return {
      ...transformedQuest,
      status: savedState?.status || 'locked',
      is_locked: savedState?.is_locked ?? true,
    };
  });

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
      <QuestRecap quests={componentQuests} />
      {componentQuests.map((quest, index) => (
        <QuestItem
          key={quest.quest_id || `quest-item-${index}`}
          quest={quest}
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
