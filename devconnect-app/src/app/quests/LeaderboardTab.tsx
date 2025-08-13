'use client';

import { useEffect, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import QuestLeaderboard from '@/components/QuestLeaderboard';
import QuestScore from '@/components/QuestScore';
import type { Quest as ApiQuest, ComponentQuest } from '@/types';

// Quest states type
type QuestStates = Record<
  string,
  { status: 'completed' | 'active' | 'locked'; is_locked: boolean }
>;

// Transform API quest data to match the ComponentQuest interface
const transformApiQuestToComponentQuest = (
  apiQuest: ApiQuest,
  questState: { status: 'completed' | 'active' | 'locked'; is_locked: boolean }
): ComponentQuest => {
  return {
    ...apiQuest,
    state: questState,
  };
};

export default function LeaderboardTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allQuests, setAllQuests] = useState<ComponentQuest[]>([]);

  // Local storage for quests data and states
  const [apiQuests] = useLocalStorage<ApiQuest[]>('quests-data', []);
  const [questStates, setQuestStates] = useLocalStorage<QuestStates>(
    'quest-states',
    {}
  );

  // Load all quests and their states for global score calculation
  useEffect(() => {
    if (apiQuests.length > 0) {
      const transformedQuests: ComponentQuest[] = apiQuests.map((apiQuest) => {
        const savedState = questStates[apiQuest.id] || {
          status: 'locked' as const,
          is_locked: true,
        };

        return transformApiQuestToComponentQuest(apiQuest, savedState);
      });

      setAllQuests(transformedQuests);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [apiQuests, questStates]);

  // Handle reset all quest states (global reset)
  const handleResetStates = () => {
    setQuestStates({});
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto flex flex-col justify-start items-start gap-3">
        <div className="text-center">Loading global score...</div>
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
      {/* Global Quest Score */}
      <div className="w-full">
        <h2 className="text-lg font-semibold text-gray-800 mb-3 text-center">
          Global Quest Progress
        </h2>
        <QuestScore quests={allQuests} onResetStates={handleResetStates} />
      </div>

      {/* Leaderboard */}
      <div className="w-full">
        <h2 className="text-lg font-semibold text-gray-800 mb-3 text-center">
          Leaderboard
        </h2>
        <QuestLeaderboard />
      </div>
    </div>
  );
}
