import { useMemo } from 'react';
import { questsData } from '@/data/quests';
import { calculateProgress } from '@/app/quests/utils/quest-helpers';

/**
 * Calculate overall quest progress across all quest groups
 * Includes: Setup & app tour (1), Crypto payment (2), and App Showcase (4)
 */
export const useQuestProgress = (
  questStates: Record<string, { status: string; completedAt?: number }>
) => {
  return useMemo(() => {
    // Get all quests from groups: Setup (1), Crypto payment (2), App Showcase (4)
    const setupQuests = questsData.filter((quest) => quest.groupId === 1);
    const cryptoPaymentQuests = questsData.filter((quest) => quest.groupId === 2);
    const appShowcaseQuests = questsData.filter((quest) => quest.groupId === 4);
    const allQuests = [...setupQuests, ...cryptoPaymentQuests, ...appShowcaseQuests];

    return calculateProgress(allQuests, questStates);
  }, [questStates]);
};

