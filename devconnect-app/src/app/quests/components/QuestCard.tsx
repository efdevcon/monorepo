'use client';

import React, { forwardRef } from 'react';
import type { Quest } from '@/types';
import { getQuestIcon, getSupporterById } from '../utils/quest-helpers';

interface QuestCardProps {
  quest: Quest;
  isCompleted: boolean;
  isExpanded?: boolean;
  verifyingQuestId: string | null;
  address: string | undefined;
  onQuestAction: (quest: Quest) => void;
  onAboutClick: (quest: Quest) => void;
  onPoapClick?: (quest: Quest, e: React.MouseEvent) => void;
  onClick?: () => void;
  showExpandedActions?: boolean;
}

const QuestCard = forwardRef<HTMLDivElement, QuestCardProps>(
  (
    {
      quest,
      isCompleted,
      isExpanded = false,
      verifyingQuestId,
      address,
      onQuestAction,
      onAboutClick,
      onPoapClick,
      onClick,
      showExpandedActions = false,
    },
    ref
  ) => {
    // For Setup Section (simple layout)
    if (!showExpandedActions) {
      return (
        <div
          ref={ref}
          className="bg-white border border-[#e2e2e9] rounded"
        >
          <div className="flex items-start gap-3 p-4">
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
                  <p className="text-sm text-[#36364c] tracking-[-0.1px] leading-[1.3] line-clamp-2">
                    {quest.instructions || 'Quest instructions missing...'}
                  </p>
                </div>

                {/* Completion Status */}
                {isCompleted && (
                  <div
                    className={`w-6 h-6 flex-shrink-0 ml-2 ${
                      quest.poapImageLink ? 'cursor-pointer' : ''
                    }`}
                    onClick={
                      quest.poapImageLink && onPoapClick
                        ? (e) => onPoapClick(quest, e)
                        : undefined
                    }
                  >
                    {quest.poapImageLink ? (
                      <img
                        src={quest.poapImageLink}
                        alt="POAP"
                        className="w-full h-full object-cover rounded-full hover:opacity-80 transition-opacity"
                      />
                    ) : (
                      <img
                        src="/images/icons/check-circle.svg"
                        alt="Completed"
                        className="w-full h-full"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Button */}
          {!isCompleted && (
            <div className="w-full p-4 bg-gradient-to-br from-[#f6b513]/40 via-[#ff85a6]/40 via-32% to-[#74acdf]/40 rounded-bl-xs rounded-br-xs flex flex-col justify-center items-center">
              <div className="w-full flex justify-start items-center gap-3">
                <button
                  data-icon="false"
                  data-state="default"
                  data-type="Secondary"
                  className="w-full bg-[#eaf3fa] border border-white rounded px-3 py-3 text-sm font-bold text-[#36364c] tracking-[-0.1px] hover:bg-[#d4e7f5] transition-colors shadow-[0px_4px_0px_0px_#595978] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => onQuestAction(quest)}
                  disabled={!address}
                >
                  <div className="text-center justify-start text-[#36364c] text-sm font-bold font-['Roboto'] leading-[14px]">
                    {quest.button || 'Verify'}
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // For District Section (expandable layout with POAP)
    return (
      <div
        ref={ref}
        className={`bg-white border rounded cursor-pointer hover:bg-gray-50 transition-colors ${
          isExpanded ? 'border-[#1b6fae]' : 'border-[#f0f0f4]'
        }`}
        onClick={onClick}
      >
        {/* Quest Card */}
        <div className="p-4">
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded flex-shrink-0 overflow-hidden">
              {quest.supporterId ? (
                (() => {
                  const supporter = getSupporterById(quest.supporterId);
                  return supporter?.logo ? (
                    <img
                      src={supporter.logo}
                      alt={supporter.name}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-300 rounded flex items-center justify-center">
                      <span className="text-xs text-gray-600">
                        {supporter?.name?.charAt(0) || '?'}
                      </span>
                    </div>
                  );
                })()
              ) : (
                <img
                  src="/images/icons/pay.png"
                  alt="PAY"
                  className="w-6 h-6 object-contain"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-gray-800 mb-1">
                {quest.name}
              </h4>
              <p
                className={`text-xs text-gray-600 leading-[1.3] ${!isExpanded ? 'line-clamp-2' : ''}`}
              >
                {quest.instructions || 'Quest instructions missing...'}
              </p>
            </div>
            <div
              className="flex flex-col items-center gap-2 cursor-pointer"
              onClick={onPoapClick ? (e) => onPoapClick(quest, e) : undefined}
            >
              <div className="w-10 h-10 flex items-center justify-center relative">
                {isCompleted ? (
                  <img
                    src={
                      quest.poapImageLink ||
                      'https://images.reactbricks.com/original/a77a7ed1-cb3e-4b3b-98d5-865a66629009.svg'
                    }
                    alt="POAP"
                    width={40}
                    height={40}
                    className="w-full h-full object-cover rounded-full hover:opacity-80 transition-opacity"
                  />
                ) : (
                  <img
                    src="/images/poap-location.svg"
                    alt="Quest Location"
                    width={40}
                    height={40}
                    className="w-full h-full hover:opacity-80 transition-opacity"
                  />
                )}
              </div>
              <div className="text-center w-14">
                {isCompleted ? (
                  <span className="text-green-600 text-[10px] font-bold">
                    COLLECTED
                  </span>
                ) : !quest.conditionValues ? (
                  <span className="text-red-600 text-[10px] font-bold"></span>
                ) : (
                  <p
                    className="text-[#0073de] text-[10px] font-bold leading-none tracking-[0.1px] hover:text-blue-800 transition-colors"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  >
                    LOCATION
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Expanded Quest Actions */}
        {isExpanded && (
          <div
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div className="bg-[#daebfb] box-border content-stretch flex flex-col items-center justify-center p-4 relative rounded-bl-[2px] rounded-br-[2px] size-full">
              <div className="content-stretch flex gap-3 items-center relative shrink-0 w-full">
                <div
                  className="basis-0 bg-[#eaf3fa] box-border content-stretch flex gap-2 grow items-center justify-center min-h-px min-w-px relative rounded-[1px] shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    aria-hidden="true"
                    className="absolute border border-solid border-white inset-0 pointer-events-none rounded-[1px] shadow-[0px_4px_0px_0px_#595978] z-0"
                  />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onAboutClick(quest);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                    }}
                    className="font-['Roboto:Bold',_sans-serif] font-bold leading-[0] relative text-[#44445d] text-sm text-center text-nowrap w-full h-full cursor-pointer z-10 flex items-center justify-center p-3"
                    style={{
                      fontVariationSettings: "'wdth' 100",
                    }}
                  >
                    <p className="leading-none whitespace-pre">About</p>
                  </button>
                  <div className="absolute inset-0 pointer-events-none shadow-[0px_4px_6px_0px_inset_#f3f8fc,0px_-3px_6px_0px_inset_#f3f8fc] z-0" />
                </div>
                {(!isCompleted || verifyingQuestId === quest.id.toString()) && (
                  <div className="basis-0 bg-[#1b6fae] box-border content-stretch flex gap-2 grow items-center justify-center min-h-px min-w-px relative rounded-[1px] shadow-[0px_4px_0px_0px_#125181] shrink-0">
                    <button
                      onClick={() => onQuestAction(quest)}
                      disabled={
                        !address || verifyingQuestId === quest.id.toString()
                      }
                      className="font-['Roboto:Bold',_sans-serif] font-bold leading-[0] relative text-sm text-center text-nowrap text-white w-full h-full cursor-pointer flex items-center justify-center p-3 disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        fontVariationSettings: "'wdth' 100",
                      }}
                    >
                      <p className="leading-none whitespace-pre">
                        {verifyingQuestId === quest.id.toString()
                          ? 'Verifying...'
                          : 'Verify'}
                      </p>
                    </button>
                    <div className="absolute inset-0 pointer-events-none shadow-[0px_2px_1px_0px_inset_#3898e0,0px_-1px_1px_0px_inset_#3898e0,0px_4px_8px_0px_inset_#3898e0,0px_-3px_6px_0px_inset_#3898e0]" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

QuestCard.displayName = 'QuestCard';

export default QuestCard;

