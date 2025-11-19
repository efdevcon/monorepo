'use client';

import React, { forwardRef } from 'react';
import type { Quest } from '@/types';
import QuestCard from './QuestCard';

interface CommunityQuestsSectionProps {
  communityQuests: Quest[];
  isExpanded: boolean;
  progress: { completed: number; total: number; percentage: number };
  isQuestCompleted: (quest: Quest) => boolean;
  verifyingQuestId: string | null;
  address: string | undefined;
  onQuestAction: (quest: Quest) => void;
  onAboutClick: (quest: Quest) => void;
  onPoapClick: (quest: Quest, e: React.MouseEvent) => void;
  onToggleExpansion: () => void;
  questRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>;
}

const CommunityQuestsSection = forwardRef<HTMLDivElement, CommunityQuestsSectionProps>(
  (
    {
      communityQuests,
      isExpanded,
      progress,
      isQuestCompleted,
      verifyingQuestId,
      address,
      onQuestAction,
      onAboutClick,
      onPoapClick,
      onToggleExpansion,
      questRefs,
    },
    ref
  ) => {
    return (
      <div
        id="community-quests-section"
        ref={ref}
        className="bg-[#f4ddd4] w-full"
      >
        {/* Community Quests Section Header - Clickable */}
        <button
          onClick={onToggleExpansion}
          className="w-full pt-6 pb-1 px-6 text-left cursor-pointer flex flex-col gap-4 items-center"
        >
          <div className="flex gap-3 items-center w-full">
            <div className="flex-1 flex flex-col gap-2">
              <h3 className="text-[20px] font-bold text-[#20202b] tracking-[-0.1px] leading-none">
                Community Quests
              </h3>
              <div className="flex flex-col gap-2 w-full">
                <p
                  className="text-xs font-medium text-[#353548] tracking-[-0.1px] leading-[1.2]"
                  style={{ fontFamily: 'Roboto Mono, monospace' }}
                >
                  {progress.completed === progress.total
                    ? 'Completed 🥳'
                    : `${progress.completed}/${progress.total} completed`}
                </p>
                <div className="w-full h-[6px] bg-white overflow-hidden rounded-full">
                  <div
                    className="h-full"
                    style={{
                      width: `${progress.percentage}%`,
                      backgroundColor:
                        progress.completed === progress.total
                          ? '#137C59'
                          : '#1b6fae',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center w-4 h-4">
            <svg
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`transform transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            >
              <path
                d="M5 7.5L10 12.5L15 7.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </button>

        {/* Community Quest List - Only show when section is expanded */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-3">
            {communityQuests.map((quest) => {
              const isCompleted = isQuestCompleted(quest);

              return (
                <QuestCard
                  key={quest.id}
                  ref={(el) => {
                    questRefs.current[quest.id] = el;
                  }}
                  quest={quest}
                  isCompleted={isCompleted}
                  verifyingQuestId={verifyingQuestId}
                  address={address}
                  onQuestAction={onQuestAction}
                  onAboutClick={onAboutClick}
                  onPoapClick={onPoapClick}
                  showExpandedActions={false}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }
);

CommunityQuestsSection.displayName = 'CommunityQuestsSection';

export default CommunityQuestsSection;


