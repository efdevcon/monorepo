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

      // Calculate actual completed quests based on quest states
      const completedQuests = groupQuests.filter((quest) => {
        const questState = questStates[quest.id.toString()];
        return questState?.status === 'completed';
      });

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
  }, [questStates]); // Update when quest states change

  // Navigation handlers
  const handleGroupClick = (group: QuestGroup) => {
    if (group.id === 1) {
      // Onboarding group - navigate to dedicated route
      router.push('/quests/onboarding');
    } else if (group.id === 4) {
      // App Showcase group - navigate to dedicated route
      router.push('/quests/app-showcase');
    } else {
      // Other groups - show inline detail view
      setSelectedGroup(group);
    }
  };

  const handleBackToGroups = () => {
    setSelectedGroup(null);
  };

  // If a group is selected, show the detail view
  if (selectedGroup) {
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

  // Reset function to clear all quest states
  const handleReset = () => {
    setQuestStates({});
    // Progress will be recalculated automatically by useEffect when questStates changes
  };

  // Show the group list
  return (
    <PageLayout title={title}>
      <div className="bg-[#f6fafe] min-h-screen">
        <div className="max-w-[500px] mx-auto">
          {/* Header Section */}
          <div className="flex flex-col gap-3 items-start justify-start px-6 pt-6">
            <h1 className="text-[28px] font-bold text-[#242436] tracking-[-0.2px] leading-none">
              Quests
            </h1>
            <p className="text-base text-[#36364c] tracking-[-0.1px] leading-[1.3]">
              Learn about Ethereum and explore the App Showcase to earn real
              rewards!
            </p>
          </div>

          {/* Quest Groups */}
          <div className="flex flex-col gap-4 items-start justify-start px-6 py-6">
            {questGroupsData.map((group) => {
              const progress = questGroupProgress[group.id];
              const isCompleted = progress?.status === 'completed';
              const isInProgress = progress?.status === 'in-progress';

              return (
                <button
                  key={group.id}
                  onClick={() => handleGroupClick(group)}
                  className="bg-center bg-cover bg-no-repeat h-[228px] relative rounded-[4px] w-full overflow-hidden hover:opacity-95 transition-opacity cursor-pointer"
                  style={{
                    backgroundImage: `url('${group.image}')`,
                  }}
                >
                  {/* Status Badge - Top Right */}
                  <div className="absolute backdrop-blur-[3px] backdrop-filter bg-[rgba(229,241,251,0.8)] box-border flex gap-2 items-center justify-center p-1 right-3 top-3 rounded">
                    {progress && (
                      <span className="font-medium text-[#36364c] text-xs tracking-[-0.1px]">
                        {progress.status === 'completed'
                          ? `${progress.completed}/${progress.total}`
                          : progress.status === 'in-progress'
                            ? `${progress.completed}/${progress.total}`
                            : 'Not started'}
                      </span>
                    )}
                  </div>

                  {/* Content Overlay - Bottom */}
                  <div className="absolute bottom-0 left-0 right-0 backdrop-blur-[1px] backdrop-filter bg-[rgba(241,248,252,0.9)] p-4">
                    <div className="flex flex-col gap-2">
                      {/* START HERE Badge for first group */}
                      {group.id === 1 && (
                        <div className="bg-[#1b6fae] px-1 w-fit flex items-center justify-center">
                          <span className="font-semibold text-white text-[10px] tracking-[0.1px]">
                            START HERE
                          </span>
                        </div>
                      )}

                      {/* Group Title */}
                      <h2 className="font-bold text-[#242436] text-lg tracking-[-0.1px] leading-[1.2] text-left">
                        {group.name}
                      </h2>

                      {/* Group Description */}
                      <p className="font-normal text-[#36364c] text-sm tracking-[-0.1px] leading-[1.4] text-left">
                        {group.description}
                      </p>
                    </div>
                  </div>

                  {/* Border */}
                  <div className="absolute border border-[#f0f0f4] border-solid inset-0 pointer-events-none rounded-[4px]" />
                </button>
              );
            })}
          </div>

          {/* Reset Button */}
          <div className="px-6 pb-6">
            <button
              onClick={handleReset}
              className="w-full bg-white border border-[#e0e0e0] rounded-lg px-4 py-3 text-[#36364c] font-medium hover:bg-gray-50 hover:border-[#d0d0d0] transition-colors"
            >
              Reset All Progress
            </button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
