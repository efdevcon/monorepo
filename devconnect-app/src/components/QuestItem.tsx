'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import StarIcon from '@/components/icons/StarIcon';
import LockIcon from '@/components/icons/LockIcon';
import ChevronIcon from '@/components/icons/ChevronIcon';
import type { ComponentQuest } from '@/types';
import { executeQuestAction } from '@/utils/quest-actions';

interface QuestItemProps {
  quest: ComponentQuest;
  onQuestComplete?: (questId: string) => void;
}

const QuestItem = ({ quest, onQuestComplete }: QuestItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExecutingAction, setIsExecutingAction] = useState(false);

  const getStatusStyles = () => {
    switch (quest.state.status) {
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

  const handleQuestAction = async () => {
    if (isExecutingAction) return;

    setIsExecutingAction(true);

    try {
      console.log(
        `Executing quest action: ${quest.conditionType} with values: ${quest.conditionValues}`
      );

      const result = await executeQuestAction(
        quest.conditionType,
        quest.conditionValues
      );

      if (result) {
        // Update quest state to completed
        onQuestComplete?.(quest.id);

        toast.success(
          <div className="space-y-2">
            <div className="font-semibold text-green-800">
              ✅ Quest Action Successful!
            </div>
            <div className="text-sm text-green-700">
              {quest.name} - Action completed successfully.
            </div>
          </div>,
          {
            duration: 4000,
            dismissible: true,
            closeButton: true,
            style: {
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            },
          }
        );
      } else {
        toast.error(
          <div className="space-y-2">
            <div className="font-semibold text-red-800">
              ❌ Quest Action Failed
            </div>
            <div className="text-sm text-red-700">
              {quest.name} - Action could not be completed. Please try again.
            </div>
          </div>,
          {
            duration: 4000,
            dismissible: true,
            closeButton: true,
            style: {
              background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            },
          }
        );
      }
    } catch (error) {
      console.error('Quest action execution failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      toast.error(
        <div className="space-y-2">
          <div className="font-semibold text-red-800">
            ❌ Quest Action Error
          </div>
          <div className="text-sm text-red-700">
            <div className="font-medium">Error:</div>
            <div className="bg-red-50 p-2 rounded border text-red-600">
              {errorMessage}
            </div>
          </div>
        </div>,
        {
          duration: 6000,
          dismissible: true,
          closeButton: true,
          style: {
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      );
    } finally {
      setIsExecutingAction(false);
    }
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
          className={`text-[11px] font-medium font-['Roboto'] leading-[14.30px] tracking-wide ${
            quest.state.status === 'completed'
              ? 'text-[#199821]'
              : 'text-[#4b4b66]'
          }`}
        >
          {`QUEST ${quest.order}`}
        </div>
        <div className="text-[#232336] text-lg font-bold font-['Roboto'] leading-normal">
          {quest.name}
        </div>
      </div>
      {isExpanded && quest.instructions && (
        <div className="w-full justify-start text-[#232336] text-sm font-normal font-['Roboto'] leading-[21px] mt-2">
          {quest.instructions}
        </div>
      )}

      {/* Expand/collapse indicator */}
      <div className="absolute right-[16px] top-[56px]">
        <ChevronIcon
          isExpanded={isExpanded}
          size="md"
          color={quest.state.status === 'completed' ? '#232336' : '#4b4b66'}
        />
      </div>

      {/* Points badge */}
      <div
        className={`size- p-1 right-4 top-4 absolute ${styles.badge} inline-flex justify-center items-center gap-1`}
      >
        {/* Lock icon for locked quests */}
        {quest.state.status === 'locked' && quest.order === 6 && (
          <div className="size- p-1 bg-[#4b4b66] rounded-[1px] inline-flex justify-center items-center gap-1 mr-1">
            <LockIcon size="md" />
          </div>
        )}
        <StarIcon isCompleted={quest.state.status === 'completed'} size="md" />
        <div
          className={`justify-start ${styles.points} text-${quest.order >= 3 ? 'xs' : 'sm'} font-black font-['Unibody_8_Pro'] leading-${quest.order >= 3 ? '3' : '[14px]'}`}
        >
          {quest.points}
        </div>
      </div>

      {/* Action button - only show when expanded */}
      {isExpanded && (
        <div
          className={`w-full pl-6 pr-4 py-4 flex justify-center items-center gap-1 mt-2 cursor-pointer transition-all duration-200 ${
            quest.state.status === 'active'
              ? 'bg-[#1b6fae] shadow-[inset_0px_6px_0px_0px_rgba(75,138,185,1.00)] shadow-[inset_0px_-6px_0px_0px_rgba(19,79,124,1.00)] hover:bg-[#155a8f]'
              : 'bg-[#4b4b66] shadow-[inset_0px_6px_0px_0px_rgba(75,75,102,1.00)] shadow-[inset_0px_-6px_0px_0px_rgba(37,37,51,1.00)] hover:bg-[#3a3a52]'
          } ${isExecutingAction ? 'opacity-75 cursor-not-allowed' : ''}`}
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering the parent click handler
            handleQuestAction();
          }}
        >
          <div className="text-center text-white text-sm font-bold font-['Roboto'] uppercase leading-[14px]">
            {isExecutingAction ? 'Executing...' : quest.button || 'TODO'}
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
    </div>
  );
};

export default QuestItem; 
