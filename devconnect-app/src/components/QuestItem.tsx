'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import StarIcon from '@/components/icons/StarIcon';
import LockIcon from '@/components/icons/LockIcon';
import ChevronIcon from '@/components/icons/ChevronIcon';
import type { ComponentQuest, QuestConditionType } from '@/types';
import { executeQuestAction } from '@/utils/quest-actions';

interface QuestItemProps {
  quest: ComponentQuest;
  onQuestComplete?: (questId: string) => void;
  isSelected?: boolean;
  isExpanded?: boolean;
  onQuestSelect?: (questId: string, isExpanded: boolean) => void;
}

const QuestItem = ({
  quest,
  onQuestComplete,
  isSelected = false,
  isExpanded = false,
  onQuestSelect,
}: QuestItemProps) => {
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const questRef = useRef<HTMLDivElement>(null);

  // Scroll into view when selected
  useEffect(() => {
    if (isSelected && questRef.current) {
      questRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [isSelected]);

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
      default:
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
    const newExpandedState = !isExpanded;
    onQuestSelect?.(quest.id.toString(), newExpandedState);
  };

  const handleQuestAction = async () => {
    if (isExecutingAction) return;

    setIsExecutingAction(true);

    try {
      console.log(
        `Executing quest action: ${quest.conditionType} with values: ${quest.conditionValues}`
      );

      const result = await executeQuestAction(
        quest.conditionType as QuestConditionType,
        quest.conditionValues
      );

      if (result) {
        // Update quest state to completed
        onQuestComplete?.(quest.id.toString());

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
      ref={questRef}
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
        <div className="w-full flex items-center gap-3">
          {/* Quest logo */}
          {quest.poapImageLink && (
            <div className="size-8 rounded-[1px] overflow-hidden bg-white flex-shrink-0">
              <img
                src={quest.poapImageLink}
                alt={`${quest.name} logo`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
          )}
          <div className="text-[#232336] text-lg font-bold font-['Roboto'] leading-normal">
            {quest.name}
          </div>
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

      {/* Quest images */}
      <div className="absolute right-10 top-2 flex items-center gap-2">
        {/* Lock icon for locked quests */}
        {quest.state.status === 'locked' && quest.order === 6 && (
          <div className="size-6 p-1 bg-[#4b4b66] rounded-[1px] inline-flex justify-center items-center">
            <LockIcon size="sm" />
          </div>
        )}

        {/* POAP image */}
        {quest.poapImageLink && (
          <div className="size-16">
            <img
              src={quest.poapImageLink}
              alt={`${quest.name} POAP`}
              className="w-full h-full rounded-full overflow-hidden object-cover border-2 border-gray-200"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        )}
      </div>

      {/* Action buttons - only show when expanded */}
      {isExpanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full flex flex-col justify-start items-start gap-2"
        >
          <div className="w-full flex gap-2 mt-2">
            {/* Learn More button */}
            <div
              className="flex-1 pl-6 pr-4 py-4 flex justify-center items-center gap-1 cursor-pointer transition-all duration-200 bg-[#6b7280] shadow-[inset_0px_6px_0px_0px_rgba(107,114,128,1.00),inset_0px_-6px_0px_0px_rgba(75,85,99,1.00)] hover:bg-[#4b5563]"
              onClick={(e) => {
                e.stopPropagation();
                // Generate deep link to map based on supporterId and name
                const generateDeepLink = () => {
                  const supporterId = quest.supporterId?.toLowerCase();
                  const name = quest.name?.toLowerCase().replace(/\s+/g, '-');

                  if (supporterId && name) {
                    return `/map#${supporterId}-${name}`;
                  }
                  return null;
                };

                const deepLink = generateDeepLink();
                if (deepLink) {
                  // Navigate to the map page with the deep link
                  window.location.href = deepLink;
                  console.log('Navigating to map:', deepLink);
                } else {
                  console.log(
                    'Could not generate deep link for quest:',
                    quest.name
                  );
                }
              }}
            >
              <div className="text-center text-white text-sm font-bold font-['Roboto'] uppercase leading-[14px]">
                View on Map
              </div>
            </div>

            {/* Action button */}
            <div
              className={`flex-1 pl-6 pr-4 py-4 flex justify-center items-center gap-1 cursor-pointer transition-all duration-200 ${
                quest.state.status === 'completed'
                  ? 'bg-[#199821] shadow-[inset_0px_6px_0px_0px_rgba(38,184,38,1.00),inset_0px_-6px_0px_0px_rgba(25,152,33,1.00)] hover:bg-[#15801a]'
                  : quest.state.status === 'active'
                    ? 'bg-[#1b6fae] shadow-[inset_0px_6px_0px_0px_rgba(75,138,185,1.00),inset_0px_-6px_0px_0px_rgba(19,79,124,1.00)] hover:bg-[#155a8f]'
                    : 'bg-[#4b4b66] shadow-[inset_0px_6px_0px_0px_rgba(75,75,102,1.00),inset_0px_-6px_0px_0px_rgba(37,37,51,1.00)] hover:bg-[#3a3a52]'
              } ${isExecutingAction ? 'opacity-75 cursor-not-allowed' : ''}`}
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering the parent click handler
                handleQuestAction();
              }}
            >
              <div className="text-center text-white text-sm font-bold font-['Roboto'] uppercase leading-[14px]">
                {isExecutingAction
                  ? 'Executing...'
                  : quest.state.status === 'completed'
                    ? 'Verified'
                    : quest.button || 'TODO'}
              </div>
              <div className="size-5 relative overflow-hidden">
                {quest.state.status === 'completed' ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      fill="white"
                    />
                  </svg>
                ) : (
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
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestItem; 
