'use client';

import React from 'react';
import { questsData } from '@/data/quests';
import type { Quest, QuestGroup } from '@/types';

interface QuestGroupDetailProps {
  group: QuestGroup;
  onBack: () => void;
  questStates: Record<string, {
    status: 'completed' | 'active' | 'locked';
    is_locked: boolean;
    isCheckedIn?: boolean;
  }>;
  updateQuestStatus: (
    questId: string,
    status: 'completed' | 'active' | 'locked',
    is_locked: boolean,
    isCheckedIn?: boolean
  ) => void;
}

export default function QuestGroupDetail({
  group,
  onBack,
  questStates,
  updateQuestStatus,
}: QuestGroupDetailProps) {
  // Get all quests for this group, sorted by order
  const groupQuests = questsData
    .filter((quest) => quest.groupId === group.id)
    .sort((a, b) => a.order - b.order);

  // Calculate progress
  const completedQuests = groupQuests.filter((quest) => {
    const questState = questStates[quest.id.toString()];
    return questState?.status === 'completed';
  });

  const completed = completedQuests.length;
  const total = groupQuests.length;
  const progressPercentage = total > 0 ? (completed / total) * 100 : 0;

  const getQuestStatus = (quest: Quest) => {
    const questState = questStates[quest.id.toString()];
    return questState?.status || 'locked';
  };

  const isQuestCompleted = (quest: Quest) => {
    return getQuestStatus(quest) === 'completed';
  };

  const handleQuestAction = (quest: Quest) => {
    const currentStatus = getQuestStatus(quest);
    if (currentStatus === 'completed') return;

    // Toggle quest status for demo purposes
    const newStatus = currentStatus === 'locked' ? 'active' : 'completed';
    updateQuestStatus(quest.id.toString(), newStatus, false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col justify-start items-start">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 w-full px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-5 h-5 text-gray-600 hover:text-gray-800"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12.5 15L7.5 10L12.5 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h1 className="text-base font-bold text-gray-800 tracking-[-0.1px] flex-1 text-center">
            {group.name}
          </h1>
          <div className="w-5" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Progress Section */}
      <div className="bg-white border-b border-gray-200 w-full px-6 py-4">
        <div className="flex gap-4 items-start">
          <div className="flex-1">
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-col gap-1">
                <h2 className="text-sm font-bold text-black tracking-[-0.1px]">
                  Complete all quests
                </h2>
                <p className="text-xs text-black tracking-[-0.1px]">
                  <span className="font-bold">Reward:</span>{' '}
                  <span className="font-normal">Item name</span>
                </p>
              </div>
              <div className="w-full">
                <div className="relative h-4 w-full bg-gray-300 rounded">
                  <div
                    className="absolute top-0 left-0 h-4 bg-gray-500 rounded"
                    style={{ width: `${progressPercentage}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-normal text-black tracking-[-0.1px]">
                      {completed} / {total}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-300 w-16 h-16 flex items-center justify-center">
            <div className="text-center">
              <div className="text-xs font-medium text-black tracking-[-0.1px]">
                {total} quests
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quest List */}
      <div className="w-full px-6 py-4 space-y-3">
        {groupQuests.map((quest, index) => {
          const isCompleted = isQuestCompleted(quest);
          const isLast = index === groupQuests.length - 1;

          return (
            <div key={quest.id} className="relative">
              {/* Quest Card */}
              <div className="bg-white border border-gray-100 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  {/* Quest Icon */}
                  <div className="w-10 h-10 bg-gray-300 rounded flex-shrink-0" />
                  
                  {/* Quest Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-black tracking-[-0.1px] mb-1">
                          {quest.name}
                        </h3>
                        <p className="text-xs text-black tracking-[-0.1px] leading-[1.3]">
                          {quest.instructions || 'Complete this quest to earn points'}
                        </p>
                      </div>
                      
                      {/* Completion Status */}
                      {isCompleted && (
                        <div className="w-5 h-5 flex-shrink-0 ml-2">
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <circle
                              cx="10"
                              cy="10"
                              r="9"
                              fill="#10B981"
                              stroke="#10B981"
                              strokeWidth="2"
                            />
                            <path
                              d="M6 10L8.5 12.5L14 7"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                {!isCompleted && (
                  <div className="mt-4">
                    <button
                      onClick={() => handleQuestAction(quest)}
                      className="w-full px-2 py-3 border border-black rounded text-sm font-bold text-black tracking-[-0.1px] hover:bg-gray-50 transition-colors"
                    >
                      {quest.button || 'Start Quest'}
                    </button>
                  </div>
                )}
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div className="absolute left-8 top-16 w-0.5 h-6 bg-gray-300" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
