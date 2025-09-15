'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from 'usehooks-ts';
import PageLayout from '@/components/PageLayout';
import { NAV_ITEMS } from '@/config/nav-items';
import { questGroupsData } from '@/data/questGroups';
import { questsData } from '@/data/quests';
import QuestGroupDetail from './QuestGroupDetail';
import AppShowcaseDetail from './AppShowcaseDetail';
import type { QuestGroup } from '@/types';

const navItem = NAV_ITEMS.find((item) => item.href === '/quests');
const navLabel = navItem?.label || 'Quests';
const title = navLabel;

// Quest group progress type
type QuestGroupProgress = {
  groupId: number;
  completed: number;
  total: number;
  status: 'completed' | 'in-progress' | 'not-started';
};

// Quest group status type
type QuestGroupStatus = 'completed' | 'in-progress' | 'not-started';

export default function QuestsPage() {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState<QuestGroup | null>(null);
  const [questGroupProgress, setQuestGroupProgress] = useLocalStorage<
    Record<number, QuestGroupProgress>
  >('quest-group-progress', {});

  // Local storage for quest status and locked state
  const [questStates, setQuestStates] = useLocalStorage<
    Record<
      string,
      {
        status: 'completed' | 'active' | 'locked';
        is_locked: boolean;
        isCheckedIn?: boolean;
      }
    >
  >('quest-states', {});

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

  // Calculate progress for each quest group
  useEffect(() => {
    const progress: Record<number, QuestGroupProgress> = {};

    questGroupsData.forEach((group) => {
      const groupQuests = questsData.filter(
        (quest) => quest.groupId === group.id
      );
      // For now, simulate some completed quests based on order
      const completedQuests = groupQuests.filter((quest) => quest.order <= 2);
      const completed = completedQuests.length;
      const total = groupQuests.length;

      let status: QuestGroupStatus = 'not-started';
      if (completed === total && total > 0) {
        status = 'completed';
      } else if (completed > 0) {
        status = 'in-progress';
      }

      progress[group.id] = {
        groupId: group.id,
        completed,
        total,
        status,
      };
    });

    setQuestGroupProgress(progress);
  }, []);

  // Navigation handlers
  const handleGroupClick = (group: QuestGroup) => {
    if (group.id === 4) {
      // App Showcase group - navigate to dedicated route
      router.push('/quests/app-showcase');
    } else {
      // Other groups (onboarding) - use state-based navigation
      setSelectedGroup(group);
    }
  };

  const handleBackToGroups = () => {
    setSelectedGroup(null);
  };

  const getStatusBadge = (
    status: QuestGroupStatus,
    completed: number,
    total: number
  ) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded';

    switch (status) {
      case 'completed':
        return (
          <div className={`${baseClasses} bg-black text-white`}>
            {completed}/{total}
          </div>
        );
      case 'in-progress':
        return (
          <div className={`${baseClasses} bg-black text-white`}>
            {completed}/{total}
          </div>
        );
      case 'not-started':
        return (
          <div className={`${baseClasses} bg-gray-300 text-black`}>
            Not started
          </div>
        );
      default:
        return null;
    }
  };

  const getStartHereBadge = (groupId: number) => {
    if (groupId === 1) {
      return (
        <div className="px-2 py-1 text-xs font-semibold text-black border border-black rounded">
          START HERE
        </div>
      );
    }
    return null;
  };

  // If a group is selected, show the detail view
  if (selectedGroup) {
    // Use AppShowcaseDetail for App Showcase group (groupId === 4)
    if (selectedGroup.id === 4) {
      return (
        <PageLayout title={title}>
          <AppShowcaseDetail
            group={selectedGroup}
            onBack={handleBackToGroups}
            questStates={questStates}
            updateQuestStatus={updateQuestStatus}
          />
        </PageLayout>
      );
    }

    // Use regular QuestGroupDetail for other groups
    return (
      <PageLayout title={title}>
        <QuestGroupDetail
          group={selectedGroup}
          onBack={handleBackToGroups}
          questStates={questStates}
          updateQuestStatus={updateQuestStatus}
        />
      </PageLayout>
    );
  }

  // Show the group list
  return (
    <PageLayout title={title}>
      <div className="w-full max-w-2xl mx-auto flex flex-col justify-start items-start gap-6 p-4">
        {/* Header Section */}
        <div className="flex flex-col gap-3 items-start justify-start w-full">
          <h1 className="text-[28px] font-bold text-black tracking-[-0.2px] leading-none">
            Quests
          </h1>
          <p className="text-base text-black tracking-[-0.1px] leading-[1.3]">
            Learn about Ethereum and explore the App Showcase to earn real
            rewards!
          </p>
        </div>

        {/* Quest Groups */}
        <div className="flex flex-col gap-4 items-start justify-start w-full">
          {questGroupsData.map((group) => {
            const progress = questGroupProgress[group.id];
            const isCompleted = progress?.status === 'completed';
            const isInProgress = progress?.status === 'in-progress';

            return (
              <button
                key={group.id}
                onClick={() => handleGroupClick(group)}
                className="bg-white border border-gray-200 rounded-lg p-4 w-full flex flex-col gap-4 items-end justify-start relative hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  {getStartHereBadge(group.id)}
                  {progress &&
                    getStatusBadge(
                      progress.status,
                      progress.completed,
                      progress.total
                    )}
                </div>

                {/* Group Content */}
                <div className="flex flex-col gap-2 items-start justify-start w-full">
                  <h2 className="text-lg font-bold text-black tracking-[-0.1px] leading-[1.2] w-full text-left">
                    {group.name}
                  </h2>
                  <p className="text-xs text-black tracking-[-0.1px] leading-[1.3] w-full text-left">
                    {group.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </PageLayout>
  );
}
