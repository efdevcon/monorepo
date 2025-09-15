'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { districtsData } from '@/data/districts';
import { questsData } from '@/data/quests';
import type { Quest, QuestGroup } from '@/types';

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

export default function AppShowcaseDetail({
  group,
  onBack,
  questStates,
  updateQuestStatus,
}: AppShowcaseDetailProps) {
  const router = useRouter();
  const [expandedQuests, setExpandedQuests] = useState<Set<number>>(new Set());
  const [expandedDistrict, setExpandedDistrict] = useState<string>('');

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

  // Handle URL-based routing for initial state loading
  useEffect(() => {
    const hash = window.location.hash.substring(1); // Remove # from hash

    if (hash) {
      // Check if it's a district slug
      const district = districtsWithQuests.find((d) => d.layerName === hash);
      if (district) {
        setExpandedDistrict(district.id);
        setExpandedQuests(new Set()); // Clear quest expansions when switching districts
        // Remove hash from URL after loading state
        router.replace('/quests/app-showcase');
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
        // Remove hash from URL after loading state
        router.replace('/quests/app-showcase');
        return;
      }
    }

    // Default: expand first district if no hash
    if (districtsWithQuests.length > 0 && !expandedDistrict) {
      setExpandedDistrict(districtsWithQuests[0].id);
    }
  }, [districtsWithQuests, appShowcaseQuests, router]);

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

  const toggleQuestExpansion = (questId: number) => {
    setExpandedQuests((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questId)) {
        newSet.delete(questId);
      } else {
        newSet.add(questId);
      }
      return newSet;
    });
  };

  const toggleDistrictExpansion = (districtId: string) => {
    setExpandedDistrict((prev) => (prev === districtId ? '' : districtId));
  };

  const selectDistrict = (districtId: string) => {
    // If clicking on the same district, toggle it (collapse if expanded)
    if (expandedDistrict === districtId) {
      setExpandedDistrict('');
      setExpandedQuests(new Set());
    } else {
      // Expand the selected district and collapse others
      setExpandedDistrict(districtId);
      setExpandedQuests(new Set()); // Clear quest expansions
    }
  };

  const handleQuestAction = (quest: Quest) => {
    const currentStatus = getQuestStatus(quest);
    if (currentStatus === 'completed') return;

    const newStatus = currentStatus === 'locked' ? 'active' : 'completed';
    updateQuestStatus(quest.id.toString(), newStatus, false);
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

      {/* Reward Section */}
      <div className="bg-white border-b border-gray-200 w-full px-6 py-4">
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
              {overallProgress.completed}/50 completed
            </div>
            <div className="relative w-full h-2 bg-gray-100 rounded">
              <div
                className="absolute top-0 left-0 h-2 bg-blue-600 rounded"
                style={{ width: `${overallProgress.percentage}%` }}
              />
              {/* Milestone markers */}
              {[10, 20, 30, 40, 50].map((milestone, index) => (
                <div
                  key={milestone}
                  className="absolute w-4 h-4 bg-white border border-blue-600 rounded-full -top-1"
                  style={{ left: `${(milestone / 50) * 100}%` }}
                >
                  <div className="w-3 h-3 m-0.5 bg-blue-600 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* District Highlight Menu */}
      <div className="bg-white border-b border-gray-200 w-full px-6 py-4 sticky top-0 z-10">
        <div className="flex gap-2 overflow-x-auto">
          {districtsWithQuests.map((district) => (
            <button
              key={district.id}
              onClick={() => selectDistrict(district.id)}
              className={`px-4 py-2 rounded text-sm font-bold whitespace-nowrap ${
                expandedDistrict === district.id
                  ? 'bg-white shadow-sm border border-gray-300'
                  : 'bg-gray-200'
              }`}
            >
              {district.name}
            </button>
          ))}
        </div>
      </div>

      {/* District Sections */}
      <div className="w-full space-y-3 p-6">
        {filteredDistricts.map((district) => {
          const quests = questsByDistrict[district.id] || [];
          const progress = getDistrictProgress(district.id);
          const isDistrictExpanded = expandedDistrict === district.id;

          return (
            <div
              key={district.id}
              className="bg-white border border-gray-200 rounded-lg"
            >
              {/* District Header - Clickable */}
              <button
                onClick={() => toggleDistrictExpansion(district.id)}
                className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex gap-3 items-center">
                  <div className="w-14 h-14 bg-gray-300 rounded" />
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
                <div className="px-6 pb-6 space-y-3">
                  {quests.map((quest) => {
                    const isCompleted = isQuestCompleted(quest);
                    const isExpanded = expandedQuests.has(quest.id);

                    return (
                      <div
                        key={quest.id}
                        className="border border-gray-100 rounded"
                      >
                        {/* Quest Card */}
                        <div className="p-4">
                          <div className="flex gap-3 items-start">
                            <div className="w-8 h-8 bg-gray-300 rounded flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-gray-800 mb-1">
                                {quest.name}
                              </h4>
                              <p className="text-xs text-gray-600 leading-[1.3]">
                                {quest.instructions ||
                                  'Complete this quest to earn points'}
                              </p>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                                {isCompleted ? (
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
                                ) : (
                                  <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 20 20"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        d="M10 6L10 14M6 10L14 10"
                                        stroke="white"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="text-xs font-bold text-center">
                                {isCompleted ? (
                                  <span className="text-green-600">
                                    COLLECTED
                                  </span>
                                ) : (
                                  <span className="text-blue-600">TO DO</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Expand/Collapse Button */}
                          <button
                            onClick={() => toggleQuestExpansion(quest.id)}
                            className="mt-2 flex items-center justify-center w-full"
                          >
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
                          </button>
                        </div>

                        {/* Expanded Quest Actions */}
                        {isExpanded && (
                          <div className="bg-blue-50 border-t border-gray-100 p-4">
                            <div className="flex gap-3 items-center">
                              <button className="px-3 py-2 bg-gray-200 rounded text-sm font-bold text-gray-700">
                                (i)
                              </button>
                              <button className="px-3 py-2 bg-gray-200 rounded text-sm font-bold text-gray-700">
                                📍
                              </button>
                              <button
                                onClick={() => handleQuestAction(quest)}
                                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700"
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
