'use client';

import React, { forwardRef } from 'react';
import type { Quest } from '@/types';
import QuestCard from './QuestCard';
import { useTranslations } from 'next-intl';

interface District {
  id: string;
  name: string;
  logo?: string;
  backgroundColor?: string;
  layerName?: string;
}

interface DistrictSectionProps {
  district: District;
  quests: Quest[];
  isExpanded: boolean;
  progress: { completed: number; total: number; percentage: number };
  expandedQuests: Set<number>;
  isQuestCompleted: (quest: Quest) => boolean;
  verifyingQuestId: string | null;
  address: string | undefined;
  onQuestAction: (quest: Quest) => void;
  onAboutClick: (quest: Quest) => void;
  onPoapClick: (quest: Quest, e: React.MouseEvent) => void;
  onToggleDistrictExpansion: (districtId: string) => void;
  onToggleQuestExpansion: (questId: number) => void;
  questRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>;
}

const DistrictSection = forwardRef<HTMLDivElement, DistrictSectionProps>(
  (
    {
      district,
      quests,
      isExpanded,
      progress,
      expandedQuests,
      isQuestCompleted,
      verifyingQuestId,
      address,
      onQuestAction,
      onAboutClick,
      onPoapClick,
      onToggleDistrictExpansion,
      onToggleQuestExpansion,
      questRefs,
    },
    ref
  ) => {
    const t = useTranslations('quests.districtSection');

    return (
      <div
        id={`district-${district.id}`}
        ref={ref}
        className="w-full"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.3) 100%), ${district.backgroundColor || 'linear-gradient(0deg, rgb(170, 167, 255) 0%, rgb(246, 180, 14) 100%)'}`,
        }}
      >
        {/* District Header - Clickable */}
        <button
          onClick={() => onToggleDistrictExpansion(district.id)}
          className="w-full pt-6 pb-1 px-6 text-left cursor-pointer flex flex-col gap-2 items-center"
        >
          <div className="flex gap-3 items-center w-full">
            {district.logo && (
              <div className="w-14 h-14">
                <img
                  src={district.logo}
                  alt={district.name}
                  width={56}
                  height={56}
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <div className="flex-1 flex flex-col gap-2">
              <h3 className="text-[20px] font-bold text-[#20202b] tracking-[-0.1px] leading-none">
                {district.name}
              </h3>
              <div className="flex flex-col gap-2 w-full">
                <p
                  className="text-xs font-medium text-[#353548] tracking-[-0.1px] leading-[1.2]"
                  style={{ fontFamily: 'Roboto Mono, monospace' }}
                >
                  {progress.completed === progress.total
                    ? t('completed')
                    : t('progress', { completed: progress.completed, total: progress.total })}
                </p>
                <div className="w-full h-[6px] bg-[#f6fafe] rounded-full overflow-hidden">
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

        {/* Quest List - Only show when district is expanded */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-3">
            {quests.map((quest) => {
              const isCompleted = isQuestCompleted(quest);
              const isQuestExpanded = expandedQuests.has(quest.id);

              return (
                <QuestCard
                  key={quest.id}
                  ref={(el) => {
                    questRefs.current[quest.id] = el;
                  }}
                  quest={quest}
                  isCompleted={isCompleted}
                  isExpanded={isQuestExpanded}
                  verifyingQuestId={verifyingQuestId}
                  address={address}
                  onQuestAction={onQuestAction}
                  onAboutClick={onAboutClick}
                  onPoapClick={onPoapClick}
                  onClick={() => onToggleQuestExpansion(quest.id)}
                  showExpandedActions={true}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }
);

DistrictSection.displayName = 'DistrictSection';

export default DistrictSection;

