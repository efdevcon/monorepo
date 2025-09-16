'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from 'usehooks-ts';
import Image from 'next/image';
import { districtsData } from '@/data/districts';
import { questsData } from '@/data/quests';
import { supportersData } from '@/data/supporters';
import type { Quest, QuestGroup } from '@/types';
import cn from 'classnames';

interface AppShowcaseDetailProps {
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

interface TabsProps {
  districts: Array<{ id: string; name: string; layerName: string }>;
  activeDistrictId: string;
  onDistrictSelect: (districtId: string) => void;
}

const Tabs = ({ districts, activeDistrictId, onDistrictSelect }: TabsProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Scroll to active tab when it changes
  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeTab = activeTabRef.current;

      const containerRect = container.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();

      const scrollLeft =
        activeTab.offsetLeft - containerRect.width / 2 + tabRect.width / 2;

      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth',
      });
    }
  }, [activeDistrictId]);

  return (
    <div className="py-4 md:py-2 w-full">
      <div ref={scrollContainerRef} className="overflow-x-auto scrollbar-hide">
        <div className="flex bg-[#EFEFF5] md:rounded w-max min-w-full p-1 gap-0">
          {districts.map((district) => (
            <button
              key={district.id}
              ref={activeDistrictId === district.id ? activeTabRef : null}
              type="button"
              className={cn(
                'flex-shrink-0 cursor-pointer px-3 py-1.5 flex justify-center items-center whitespace-nowrap rounded-[1px] min-w-max'
              )}
              style={{
                outline: 'none',
                border: 'none',
                background:
                  activeDistrictId === district.id ? '#fff' : 'transparent',
              }}
              onClick={() => onDistrictSelect(district.id)}
            >
              <div
                className={cn(
                  'text-center justify-center text-sm font-medium leading-tight flex gap-1.5',
                  activeDistrictId === district.id
                    ? 'text-[#232336]'
                    : 'text-[#4b4b66] cursor-pointer'
                )}
              >
                {district.name}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function AppShowcaseDetail({
  group,
  onBack,
  questStates,
  updateQuestStatus,
}: AppShowcaseDetailProps) {
  const router = useRouter();
  const [expandedQuests, setExpandedQuests] = useState<Set<number>>(new Set());
  const [expandedDistrict, setExpandedDistrict] = useState<string>('');
  const hasInitialized = useRef(false);
  const [pwa] = useLocalStorage<boolean | null>('pwa', null);

  // Get all App Showcase quests (groupId === 4)
  const appShowcaseQuests = questsData.filter((quest) => quest.groupId === 4);

  // Group quests by district
  const questsByDistrict = useMemo(() => {
    const grouped: Record<string, Quest[]> = {};

    appShowcaseQuests.forEach((quest) => {
      const districtId = quest.districtId?.toString();
      if (districtId && districtsData[districtId]) {
        if (!grouped[districtId]) {
          grouped[districtId] = [];
        }
        grouped[districtId].push(quest);
      }
    });

    // Sort quests within each district by order
    Object.keys(grouped).forEach((districtId) => {
      grouped[districtId].sort((a, b) => a.order - b.order);
    });

    return grouped;
  }, [appShowcaseQuests]);

  // Get districts that have quests, sorted alphabetically
  const districtsWithQuests = useMemo(() => {
    return Object.keys(questsByDistrict)
      .map((districtId) => ({
        id: districtId,
        ...districtsData[districtId],
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [questsByDistrict]);

  // Handle URL-based routing
  useEffect(() => {
    // Only run once on mount or when districts change
    if (hasInitialized.current) return;

    const hash = window.location.hash.substring(1); // Remove # from hash

    if (hash) {
      // Check if it's a district slug
      const district = districtsWithQuests.find((d) => d.layerName === hash);
      if (district) {
        setExpandedDistrict(district.id);
        setExpandedQuests(new Set()); // Clear quest expansions when switching districts
        hasInitialized.current = true;
        return;
      }

      // Check if it's a quest ID
      const quest = appShowcaseQuests.find((q) => q.id.toString() === hash);
      if (quest) {
        const questDistrict = districtsWithQuests.find(
          (d) => d.id === quest.districtId?.toString()
        );
        if (questDistrict) {
          setExpandedDistrict(questDistrict.id);
          setExpandedQuests(new Set([quest.id]));
        }
        hasInitialized.current = true;
        return;
      }
    }

    // Default: expand first district if no hash
    if (districtsWithQuests.length > 0 && !expandedDistrict) {
      setExpandedDistrict(districtsWithQuests[0].id);
      hasInitialized.current = true;
    }
  }, [districtsWithQuests, appShowcaseQuests, expandedDistrict]);

  // Use all districts since we're not filtering anymore
  const filteredDistricts = districtsWithQuests;

  // Calculate progress for a district
  const getDistrictProgress = (districtId: string) => {
    const quests = questsByDistrict[districtId] || [];
    const completed = quests.filter((quest) => {
      const questState = questStates[quest.id.toString()];
      return questState?.status === 'completed';
    }).length;

    return {
      completed,
      total: quests.length,
      percentage: quests.length > 0 ? (completed / quests.length) * 100 : 0,
    };
  };

  // Get quest status
  const getQuestStatus = (quest: Quest) => {
    const questState = questStates[quest.id.toString()];
    return questState?.status || 'locked';
  };

  const isQuestCompleted = (quest: Quest) => {
    return getQuestStatus(quest) === 'completed';
  };

  // Get supporter by ID
  const getSupporterById = (supporterId: string) => {
    return supportersData[supporterId] || null;
  };

  const toggleQuestExpansion = (questId: number) => {
    setExpandedQuests((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questId)) {
        // If quest is already expanded, collapse it
        newSet.delete(questId);
      } else {
        // If quest is not expanded, clear all others and expand this one
        newSet.clear();
        newSet.add(questId);
      }
      return newSet;
    });
  };

  const toggleDistrictExpansion = (districtId: string) => {
    const isCurrentlyExpanded = expandedDistrict === districtId;

    if (isCurrentlyExpanded) {
      // Collapse the district
      setExpandedDistrict('');
      setExpandedQuests(new Set());
    } else {
      // Use selectDistrict to ensure tab selection and quest expansion
      selectDistrict(districtId);
    }
  };

  const selectDistrict = (districtId: string) => {
    const district = districtsWithQuests.find((d) => d.id === districtId);
    if (district) {
      setExpandedDistrict(districtId);

      // Find the first uncompleted quest in this district
      const quests = questsByDistrict[districtId] || [];
      const firstUncompletedQuest = quests.find((quest) => {
        const questState = questStates[quest.id.toString()];
        return questState?.status !== 'completed';
      });

      // Expand the first uncompleted quest if found, otherwise clear expansions
      if (firstUncompletedQuest) {
        setExpandedQuests(new Set([firstUncompletedQuest.id]));
      } else {
        setExpandedQuests(new Set()); // Clear quest expansions if all are completed
      }

      // Scroll to the district section after a brief delay to allow state update
      setTimeout(() => {
        const districtElement = document.getElementById(
          `district-${districtId}`
        );
        if (districtElement) {
          // Calculate offset to account for sticky tabs (59px + some padding)
          const stickyTabsHeight = 80; // 59px + some padding
          const elementTop = districtElement.offsetTop;
          const offsetPosition = elementTop - stickyTabsHeight;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth',
          });
        }
      }, 100);
    }
  };

  const handleQuestAction = (quest: Quest) => {
    const currentStatus = getQuestStatus(quest);
    if (currentStatus === 'completed') return;

    const newStatus = currentStatus === 'locked' ? 'active' : 'completed';
    updateQuestStatus(quest.id.toString(), newStatus, false);
  };

  const handleTodoClick = (quest: Quest) => {
    // Find the district for this quest to get the layerName
    const questDistrict = districtsWithQuests.find(
      (d) => d.id === quest.districtId?.toString()
    );

    if (questDistrict) {
      // Redirect to /worlds-fair#layerName
      router.push(`/worlds-fair#${questDistrict.layerName}`);
    }
  };

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    const allQuests = appShowcaseQuests;
    const completed = allQuests.filter((quest) => {
      const questState = questStates[quest.id.toString()];
      return questState?.status === 'completed';
    }).length;

    return {
      completed,
      total: allQuests.length,
      percentage:
        allQuests.length > 0 ? (completed / allQuests.length) * 100 : 0,
    };
  }, [appShowcaseQuests, questStates]);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col justify-start items-start relative">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 w-full px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800 tracking-[-0.1px] flex-1 text-center">
            {group.name}
          </h1>
          <div className="w-5" /> {/* Spacer for centering */}
        </div>
      </div>
      {/* District Tabs */}
      <div
        className="bg-white border-b border-gray-200 w-full px-4 z-20 sticky"
        style={{
          top: pwa === true ? '118px' : '59px', // PWA mode: 118px, regular mode: 59px
          transform: 'translate3d(0, 0, 0)', // Force hardware acceleration for smooth rendering
        }}
      >
        <div className="max-w-2xl mx-auto">
          <Tabs
            districts={districtsWithQuests}
            activeDistrictId={expandedDistrict}
            onDistrictSelect={selectDistrict}
          />
        </div>
      </div>
      {/* Reward Section */}
      <div className="bg-white border-b border-gray-200 w-full px-4 py-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-bold text-gray-800 tracking-[-0.1px]">
              Complete 10 quests
            </h2>
            <p className="text-sm text-gray-600">
              <span className="font-bold">Reward:</span>{' '}
              <span className="font-normal">Spin the Prize Wheel!</span>
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="text-xs font-medium text-gray-600 tracking-[-0.1px]">
              {overallProgress.completed}/{overallProgress.total} completed
            </div>
            <div className="relative w-full h-2 bg-gray-100 rounded">
              <div
                className="absolute top-0 left-0 h-2 bg-blue-600 rounded"
                style={{ width: `${overallProgress.percentage}%` }}
              />
              {/* Milestone markers */}
              {[10, 20, 30, 40, 50].map((milestone, index) => {
                // Only show milestone if it's less than or equal to the total quests
                if (milestone <= overallProgress.total) {
                  return (
                    <div
                      key={milestone}
                      className="absolute w-4 h-4 bg-white border border-blue-600 rounded-full -top-1"
                      style={{
                        left: `${(milestone / overallProgress.total) * 100}%`,
                      }}
                    >
                      <div className="w-3 h-3 m-0.5 bg-blue-600 rounded-full" />
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </div>
      </div>
      {/* District Sections */}
      <div className="w-full space-y-3 p-4">
        {filteredDistricts.map((district) => {
          const quests = questsByDistrict[district.id] || [];
          const progress = getDistrictProgress(district.id);
          const isDistrictExpanded = expandedDistrict === district.id;

          return (
            <div
              key={district.id}
              id={`district-${district.id}`}
              className="border border-gray-200 rounded-lg"
              style={{
                backgroundImage: `linear-gradient(90deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.7) 100%), ${district.backgroundColor || 'linear-gradient(0deg, rgb(170, 167, 255) 0%, rgb(246, 180, 14) 100%)'}`,
              }}
            >
              {/* District Header - Clickable */}
              <button
                onClick={() => toggleDistrictExpansion(district.id)}
                className="w-full p-4 text-left hover:bg-white/20 transition-colors rounded-lg"
              >
                <div className="flex gap-3 items-center">
                  <div className="w-14 h-14 rounded overflow-hidden">
                    <img
                      src={`/images/districts/${district.layerName}.svg`}
                      alt={district.name}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 tracking-[-0.1px] mb-2">
                      {district.name}
                    </h3>
                    <div className="flex flex-col gap-2">
                      <div className="text-xs font-medium text-gray-600 tracking-[-0.1px]">
                        {progress.completed}/{progress.total} completed
                      </div>
                      <div className="w-full h-2 bg-blue-50 rounded">
                        <div
                          className="h-2 bg-blue-600 rounded"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={`transform transition-transform ${
                        isDistrictExpanded ? 'rotate-180' : ''
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
                </div>
              </button>

              {/* Quest List - Only show when district is expanded */}
              {isDistrictExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  {quests.map((quest) => {
                    const isCompleted = isQuestCompleted(quest);
                    const isExpanded = expandedQuests.has(quest.id);

                    return (
                      <div
                        key={quest.id}
                        className={`bg-white border rounded cursor-pointer hover:bg-gray-50 transition-colors ${
                          isExpanded ? 'border-[#1b6fae]' : 'border-[#f0f0f4]'
                        }`}
                        onClick={() => toggleQuestExpansion(quest.id)}
                      >
                        {/* Quest Card */}
                        <div className="p-4">
                          <div className="flex gap-3 items-start">
                            <div className="w-8 h-8 rounded flex-shrink-0 overflow-hidden">
                              {quest.supporterId ? (
                                (() => {
                                  const supporter = getSupporterById(
                                    quest.supporterId
                                  );
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
                                <div className="w-full h-full bg-gray-300 rounded flex items-center justify-center">
                                  <span className="text-xs text-gray-600">
                                    ?
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-gray-800 mb-1">
                                {quest.name}
                              </h4>
                              <p className="text-xs text-gray-600 leading-[1.3]">
                                {quest.instructions ||
                                  'Complete this quest to earn points'}
                              </p>
                            </div>
                            <div
                              className={`flex flex-col items-center gap-2 ${!isCompleted ? 'cursor-pointer' : ''}`}
                              onClick={
                                !isCompleted
                                  ? (e) => {
                                      e.stopPropagation();
                                      handleTodoClick(quest);
                                    }
                                  : undefined
                              }
                            >
                              <div className="w-10 h-10 rounded-full flex items-center justify-center relative">
                                {isCompleted ? (
                                  quest.poapImageLink ? (
                                    <img
                                      src={quest.poapImageLink}
                                      alt="POAP"
                                      width={40}
                                      height={40}
                                      className="w-full h-full object-cover rounded-full"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                      <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 20 20"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          d="M6 10L8.5 12.5L14 7"
                                          stroke="white"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    </div>
                                  )
                                ) : (
                                  <div className="relative w-10 h-10">
                                    {/* Background ellipse */}
                                    <div className="absolute inset-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200" />
                                    {/* Location icon */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="text-[#1b6fae]"
                                      >
                                        <path
                                          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                                          fill="currentColor"
                                        />
                                      </svg>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="text-center w-14">
                                {isCompleted ? (
                                  <span className="text-green-600 text-[10px] font-bold">
                                    COLLECTED
                                  </span>
                                ) : (
                                  <p
                                    className="text-[#1b6fae] text-[10px] font-normal leading-none tracking-[0.1px] hover:text-blue-800 transition-colors"
                                    style={{ fontFamily: 'Roboto, sans-serif' }}
                                  >
                                    TO DO
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Expand/Collapse Indicator */}
                          <div className="mt-2 flex items-center justify-center w-full">
                            <svg
                              width="12"
                              height="12"
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
                        </div>

                        {/* Expanded Quest Actions */}
                        {isExpanded && (
                          <div
                            className="bg-white border-t border-gray-100 p-4 rounded-bl rounded-br"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex gap-3 items-center">
                              <button className="flex-1 px-3 py-3 bg-[#eaf3fa] rounded text-sm font-bold text-[#36364c] hover:bg-[#d4e7f5] transition-colors">
                                Learn more
                              </button>
                              <button
                                onClick={() => handleQuestAction(quest)}
                                className="flex-1 px-3 py-3 bg-[#1b6fae] text-white rounded text-sm font-bold hover:bg-[#125181] transition-colors shadow-[0px_4px_0px_0px_#125181]"
                              >
                                Verify quest
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
