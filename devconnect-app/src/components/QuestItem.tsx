'use client';

import { useState } from 'react';
import StarIcon from '@/components/icons/StarIcon';
import LockIcon from '@/components/icons/LockIcon';
import ChevronIcon from '@/components/icons/ChevronIcon';

interface Quest {
  number: number;
  quest_id: string;
  type: string;
  title: string;
  description?: string;
  points: number;
  action?: string;
  status: 'completed' | 'active' | 'locked';
  is_locked: boolean;
}

const QuestItem = ({ quest }: { quest: Quest }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusStyles = () => {
    switch (quest.status) {
      case 'completed':
        return {
          container: 'bg-[#eaf9eb]',
          badge: 'bg-[#9aeea0]',
          points: 'text-[#232336]',
        };
      case 'active':
        return {
          container:
            'bg-[#e8f3fb] outline outline-1 outline-offset-[-1px] outline-[#1b6fae]',
          badge: 'bg-[#4b4b66] rounded-[1px]',
          points: 'text-[#f6b40e]',
        };
      case 'locked':
        return {
          container:
            'bg-[#f5f5f9] outline outline-1 outline-offset-[-1px] outline-[#dfdfeb]',
          badge: 'bg-[#4b4b66] rounded-[1px]',
          points: 'text-[#f6b40e]',
        };
    }
  };

  const styles = getStatusStyles();

  const handleClick = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      className={`w-full p-4 relative ${styles.container} rounded-[1px] flex flex-col justify-start items-start gap-2 cursor-pointer transition-all duration-200 min-h-[80px] ${
        isExpanded ? 'shadow-lg' : 'hover:shadow-md'
      }`}
      onClick={handleClick}
    >
      <div className="w-full flex flex-col justify-start items-start gap-1">
        <div
          className={`w-full justify-start text-[11px] font-medium font-['Roboto'] leading-[14.30px] tracking-wide ${
            quest.status === 'completed' ? 'text-[#199821]' : 'text-[#4b4b66]'
          }`}
        >
          {quest.number === 6
            ? 'FINAL QUEST'
            : `QUEST ${quest.type.toUpperCase()}`}
        </div>
        <div className="w-full justify-start text-[#232336] text-lg font-bold font-['Roboto'] leading-normal">
          {quest.title}
        </div>
        {isExpanded && quest.description && (
          <div className="w-full justify-start text-[#232336] text-sm font-normal font-['Roboto'] leading-[21px] mt-2">
            {quest.description}
          </div>
        )}
      </div>

      {/* Points badge */}
      <div
        className={`size- p-1 left-[8px] top-[8px] absolute ${styles.badge} inline-flex justify-center items-center gap-1`}
      >
        {/* Lock icon for locked quests */}
        {quest.status === 'locked' && quest.number === 6 && (
          <div className="size- p-1 bg-[#4b4b66] rounded-[1px] inline-flex justify-center items-center gap-1 mr-1">
            <LockIcon size="md" />
          </div>
        )}
        <StarIcon isCompleted={quest.status === 'completed'} size="md" />
        <div
          className={`justify-start ${styles.points} text-${quest.number >= 3 ? 'xs' : 'sm'} font-black font-['Unibody_8_Pro'] leading-${quest.number >= 3 ? '3' : '[14px]'}`}
        >
          {quest.points}
        </div>
      </div>

      {/* Action button - only show when expanded */}
      {isExpanded && quest.action && (
        <div
          className={`w-full pl-6 pr-4 py-4 flex justify-center items-center gap-1 mt-2 ${
            quest.status === 'active'
              ? 'bg-[#1b6fae] shadow-[inset_0px_6px_0px_0px_rgba(75,138,185,1.00)] shadow-[inset_0px_-6px_0px_0px_rgba(19,79,124,1.00)]'
              : 'bg-[#4b4b66] shadow-[inset_0px_6px_0px_0px_rgba(75,75,102,1.00)] shadow-[inset_0px_-6px_0px_0px_rgba(37,37,51,1.00)]'
          }`}
        >
          <div className="text-center text-white text-sm font-bold font-['Roboto'] uppercase leading-[14px]">
            {quest.action}
          </div>
          <div className="size-5 relative overflow-hidden">
            <svg
              width="21"
              height="20"
              viewBox="0 0 21 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11.7004 13.6V11.2H9.30039V13.6H11.7004ZM6.90039 13.6V16H9.30039V13.6H6.90039ZM9.30039 8.8H11.7004V6.4H9.30039V8.8ZM14.1004 8.8H11.7004V11.2H14.1004V8.8ZM9.30039 6.4V4H6.90039V6.4H9.30039Z"
                fill="white"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Expand/collapse indicator */}
      <div className="absolute right-4 top-4">
        <ChevronIcon
          isExpanded={isExpanded}
          size="md"
          color={quest.status === 'completed' ? '#232336' : '#4b4b66'}
        />
      </div>
    </div>
  );
};

export default QuestItem;
export type { Quest }; 
