'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { questsData } from '@/data/quests';
import { supportersData } from '@/data/supporters';
import { districtsData } from '@/data/districts';
import type { Quest, QuestGroup } from '@/types';

interface QuestGroupDetailProps {
  group: QuestGroup;
  onBack: () => void;
  questStates: Record<
    string,
    {
      status: 'completed' | 'active' | 'locked';
      is_locked: boolean;
      isCheckedIn?: boolean;
    }
  >;
  updateQuestStatus: (
    questId: string,
    status: 'completed' | 'active' | 'locked',
    is_locked: boolean,
    isCheckedIn?: boolean
  ) => void;
}

// Quest icons mapping based on action type
const getQuestIcon = (action: string) => {
  const iconMap: Record<string, string> = {
    'connect-wallet': '/images/icons/ticket.svg',
    'associate-ticket': '/images/icons/heart-outline.svg',
    'setup-profile': '/images/icons/map.svg',
    'visit-link': '/images/icons/qrcode-scan.svg',
    'mini-quiz': '/images/icons/cash-plus.svg',
    'verify-payment': '/images/icons/cash-plus.svg',
    'claim-poap': '/images/icons/check-circle.svg',
    'verify-basename': '/images/icons/check-circle.svg',
  };

  return iconMap[action] || '/images/icons/default-quest.svg';
};

// Get supporter by ID
const getSupporterById = (supporterId: string) => {
  return supportersData[supporterId] || null;
};

export default function QuestGroupDetail({
  group,
  onBack,
  questStates,
  updateQuestStatus,
}: QuestGroupDetailProps) {
  const router = useRouter();

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

    // Go directly from locked to completed
    updateQuestStatus(quest.id.toString(), 'completed', false);
  };

  const handleTodoClick = (quest: Quest) => {
    // Handle different quest actions
    if (quest.action === 'visit-link' && quest.conditionValues) {
      // Extract link from conditionValues (remove quotes)
      const link = quest.conditionValues.replace(/"/g, '');
      window.open(link, '_blank');
    } else if (quest.action === 'associate-ticket') {
      // Navigate to schedule or ticket page
      window.open('/schedule', '_blank');
    } else if (quest.action === 'setup-profile') {
      // Navigate to map page
      window.open('/map', '_blank');
    } else if (quest.action === 'mini-quiz') {
      // Navigate to quiz or exchange page
      window.open('/exchange', '_blank');
    }
    // For other actions, just complete the quest
    handleQuestAction(quest);
  };

  const handlePoapLocationClick = (quest: Quest, e: React.MouseEvent) => {
    e.stopPropagation();
    // Get the supporter/layer name for this quest
    const supporterId = quest.supporterId?.toString();
    if (supporterId && supportersData[supporterId]) {
      const supporter = supportersData[supporterId];
      router.push(`/map?filter=${supporter.layerName}`);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col justify-start items-start">
      {/* Header */}
      <div className="bg-white border-b border-[#e0e0eb] w-full px-5 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-6 h-6 flex items-center justify-center"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 18L9 12L15 6"
                stroke="#36364c"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h1 className="text-base font-bold text-[#36364c] tracking-[-0.1px] flex-1 text-center">
            {group.name}
          </h1>
          <div className="w-6" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Reward Section */}
      <div className="bg-white border-b border-[#eeeeee] w-full px-6 py-4">
        <div className="flex gap-4 items-start">
          <div className="flex-1">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-bold text-[#242436] tracking-[-0.1px]">
                  Complete all quests
                </h2>
                <p className="text-sm text-[#36364c] tracking-[-0.1px]">
                  <span className="font-bold">Reward:</span>{' '}
                  <span className="font-normal">Spin the Prize Wheel!</span>
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-xs font-medium text-[#4b4b66] tracking-[-0.1px]">
                  {completed}/{total} completed
                </div>
                <div className="bg-[#e0effa] h-2 w-full rounded">
                  <div
                    className="bg-[#1b6fae] h-2 rounded"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-center bg-cover bg-no-repeat w-18 h-18 rounded border border-white">
            <img
              src="/images/Quests.png"
              alt={group.name}
              className="w-full h-full object-cover rounded"
            />
          </div>
        </div>
      </div>

      {/* Quest List */}
      <div className="w-full px-6 py-4 space-y-3 bg-[#f6fafe]">
        {groupQuests.map((quest, index) => {
          const isCompleted = isQuestCompleted(quest);
          const isLast = index === groupQuests.length - 1;

          return (
            <div key={quest.id} className="relative">
              {/* Quest Card */}
              <div className="bg-white border border-[#e2e2e9] rounded p-4">
                <div className="flex items-start gap-3">
                  {/* Quest Icon */}
                  <div className="w-6 h-6 flex-shrink-0">
                    {quest.supporterId ? (
                      (() => {
                        const supporter = getSupporterById(quest.supporterId);
                        return supporter?.logo ? (
                          <img
                            src={supporter.logo}
                            alt={supporter.name}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <img
                            src={getQuestIcon(quest.action)}
                            alt={quest.name}
                            className="w-full h-full"
                          />
                        );
                      })()
                    ) : (
                      <img
                        src={getQuestIcon(quest.action)}
                        alt={quest.name}
                        className="w-full h-full"
                      />
                    )}
                  </div>

                  {/* Quest Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-[#242436] tracking-[-0.1px] mb-1 leading-[1.3]">
                          {quest.name}
                        </h3>
                        <p className="text-sm text-[#36364c] tracking-[-0.1px] leading-[1.3]">
                          {quest.instructions ||
                            'Complete this quest to earn points'}
                        </p>
                      </div>

                      {/* Completion Status */}
                      {quest.poapImageLink ? (
                        <div
                          className={`w-6 h-6 flex-shrink-0 ml-2 ${
                            !isCompleted ? 'cursor-pointer' : ''
                          }`}
                          onClick={
                            !isCompleted
                              ? (e) => handlePoapLocationClick(quest, e)
                              : undefined
                          }
                        >
                          {isCompleted ? (
                            <img
                              src={quest.poapImageLink}
                              alt="POAP"
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#f0f0f4] rounded-full border border-[#c7c7d0] hover:bg-[#e5e5e9] transition-colors">
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                                  fill="#4b4b66"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                      ) : (
                        isCompleted && (
                          <div className="w-6 h-6 flex-shrink-0 ml-2">
                            <img
                              src="/images/icons/check-circle.svg"
                              alt="Completed"
                              className="w-full h-full"
                            />
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                {!isCompleted && (
                  <div className="mt-4 w-full p-4 bg-gradient-to-br from-[#f6b513]/40 via-[#ff85a6]/40 via-32% to-[#74acdf]/40 rounded-bl-xs rounded-br-xs flex flex-col justify-center items-center">
                    <div className="w-full flex justify-start items-center gap-3">
                      <div
                        data-icon="false"
                        data-state="default"
                        data-type="Secondary"
                        className="w-full bg-[#eaf3fa] border border-white rounded px-3 
                      py-3 text-sm font-bold text-[#36364c] tracking-[-0.1px] hover:bg-
                      [#d4e7f5] transition-colors shadow-[0px_4px_0px_0px_#595978] cursor-pointer"
                        onClick={() => handleTodoClick(quest)}
                      >
                        <div className="text-center justify-start text-[#36364c] text-sm font-bold font-['Roboto'] leading-[14px]">
                          {quest.button || 'Verify'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
