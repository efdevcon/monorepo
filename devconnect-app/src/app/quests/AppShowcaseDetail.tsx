'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from 'usehooks-ts';
import Image from 'next/image';
import { districtsData } from '@/data/districts';
import { questsData } from '@/data/quests';
import { supportersData } from '@/data/supporters';
import type { Quest, QuestAction, QuestGroup } from '@/types';
import cn from 'classnames';
import { SupporterInfo } from '@/app/map/venue-map/components/SupporterInfo';
import { executeQuestAction } from '@/utils/quest-actions';
import { useWalletManager } from '@/hooks/useWalletManager';

// Quest icons mapping based on action type
const getQuestIcon = (action: QuestAction) => {
  const iconMap: Record<QuestAction, string> = {
    'connect-wallet': '/images/icons/ticket.svg',
    'associate-ticket': '/images/icons/ticket.svg',
    'setup-profile': '/images/icons/map.svg',
    'visit-link': '/images/icons/cash-plus.svg',
    'mini-quiz': '/images/icons/cash-plus.svg',
    'verify-payment': '/images/icons/cash-plus.svg',
    'claim-poap': '/images/icons/check-circle.svg',
    'verify-basename': '/images/icons/check-circle.svg',
    'favorite-schedule': '/images/icons/heart-outline.svg',
    'explore-map': '/images/icons/map.svg',
    'try-qr': '/images/icons/qrcode-scan.svg',
    'verify-ens': '/images/icons/cash-plus.svg',
    todo: '/images/icons/default-quest.svg',
    'verify-balance': '/images/icons/cash-plus.svg',
    '': '/images/icons/default-quest.svg',
  };

  return iconMap[action] || '/images/icons/default-quest.svg';
};

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
  showSetupTab?: boolean;
  isSetupTabActive?: boolean;
  isSetupSectionExpanded?: boolean;
  onSetupTabSelect?: () => void;
}

const Tabs = ({
  districts,
  activeDistrictId,
  onDistrictSelect,
  showSetupTab = false,
  isSetupTabActive = false,
  isSetupSectionExpanded = false,
  onSetupTabSelect,
}: TabsProps) => {
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
  }, [activeDistrictId, isSetupTabActive, isSetupSectionExpanded]);

  return (
    <div className="py-4 md:py-2 w-full">
      <div ref={scrollContainerRef} className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 w-max min-w-full">
          {/* Setup & app tour tab */}
          {showSetupTab && (
            <button
              ref={isSetupTabActive ? activeTabRef : null}
              type="button"
              className={cn(
                'flex-shrink-0 cursor-pointer px-4 py-2 flex justify-center items-center whitespace-nowrap rounded-[2px] min-w-max transition-colors',
                isSetupTabActive && isSetupSectionExpanded
                  ? 'bg-[#165a8d] text-white'
                  : 'bg-[#ededf0] text-[#4b4b66] hover:bg-[#e0e0e5]'
              )}
              onClick={onSetupTabSelect}
            >
              <span className="text-sm font-medium leading-none tracking-[-0.1px]">
                Setup & app tour
              </span>
            </button>
          )}

          {/* District tabs */}
          {districts.map((district) => (
            <button
              key={district.id}
              ref={activeDistrictId === district.id ? activeTabRef : null}
              type="button"
              className={cn(
                'flex-shrink-0 cursor-pointer px-4 py-2 flex justify-center items-center whitespace-nowrap rounded-[2px] min-w-max transition-colors',
                activeDistrictId === district.id
                  ? 'bg-[#165a8d] text-white'
                  : 'bg-[#ededf0] text-[#4b4b66] hover:bg-[#e0e0e5]'
              )}
              onClick={() => onDistrictSelect(district.id)}
            >
              <span className="text-sm font-medium leading-none tracking-[-0.1px]">
                {district.name}
              </span>
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
  const { address } = useWalletManager();
  const [expandedQuests, setExpandedQuests] = useState<Set<number>>(new Set());
  const [expandedDistrict, setExpandedDistrict] = useState<string>('');
  const [showSupporterInfo, setShowSupporterInfo] = useState<Quest | null>(
    null
  );
  const [isSetupTabActive, setIsSetupTabActive] = useState<boolean>(false);
  const [isSetupSectionExpanded, setIsSetupSectionExpanded] =
    useState<boolean>(false);
  const hasInitialized = useRef(false);
  const [pwa] = useLocalStorage<boolean | null>('pwa', null);
  const questRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Get all App Showcase quests (groupId === 4)
  const appShowcaseQuests = questsData.filter((quest) => quest.groupId === 4);

  // Get all Setup & app tour quests (groupId === 1)
  const setupQuests = questsData.filter((quest) => quest.groupId === 1);

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

    // Sort quests within each district alphabetically
    Object.keys(grouped).forEach((districtId) => {
      grouped[districtId].sort((a, b) => a.name.localeCompare(b.name));
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

          // Scroll to the quest after state updates
          setTimeout(() => {
            const questElement = questRefs.current[quest.id];
            if (questElement) {
              // Calculate offset to account for sticky tabs and menu
              const stickyTabsHeight = pwa === true ? 108 : 48; // PWA mode: 108px, regular mode: 59px
              const menuHeight = 30; // Additional 30px for menu
              const elementTop = questElement.offsetTop;
              const offsetPosition =
                elementTop - stickyTabsHeight - menuHeight - 45; // Extra 45px padding

              window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth',
              });
            }
          }, 200); // Increased delay to ensure DOM updates are complete
        }
        hasInitialized.current = true;
        return;
      }
    }

    // Default: show setup tab if no hash
    if (!expandedDistrict && !isSetupTabActive) {
      setIsSetupTabActive(true);
      setIsSetupSectionExpanded(true);
      hasInitialized.current = true;
    }
  }, [
    districtsWithQuests,
    appShowcaseQuests,
    expandedDistrict,
    pwa,
    isSetupTabActive,
  ]);

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

  const toggleSetupSectionExpansion = () => {
    const isCurrentlyExpanded = isSetupSectionExpanded;

    if (isCurrentlyExpanded) {
      // Collapse the setup section
      setIsSetupSectionExpanded(false);
      setExpandedQuests(new Set());
    } else {
      // Expand the setup section and collapse any expanded district
      setIsSetupSectionExpanded(true);
      setExpandedDistrict(''); // Collapse any expanded district
      setIsSetupTabActive(true); // Ensure setup tab is highlighted

      // Find the first uncompleted quest in setup quests
      const firstUncompletedQuest = setupQuests.find((quest) => {
        const questState = questStates[quest.id.toString()];
        return questState?.status !== 'completed';
      });

      // Expand the first uncompleted quest if found, otherwise clear expansions
      if (firstUncompletedQuest) {
        setExpandedQuests(new Set([firstUncompletedQuest.id]));
      } else {
        setExpandedQuests(new Set()); // Clear quest expansions if all are completed
      }
    }
  };

  const selectSetupTab = () => {
    setIsSetupTabActive(true);
    setExpandedDistrict('');
    setIsSetupSectionExpanded(true);

    // Find the first uncompleted quest in setup quests
    const firstUncompletedQuest = setupQuests.find((quest) => {
      const questState = questStates[quest.id.toString()];
      return questState?.status !== 'completed';
    });

    // Expand the first uncompleted quest if found, otherwise clear expansions
    if (firstUncompletedQuest) {
      setExpandedQuests(new Set([firstUncompletedQuest.id]));
    } else {
      setExpandedQuests(new Set()); // Clear quest expansions if all are completed
    }

    // Scroll to the setup section after a brief delay to allow state update
    setTimeout(() => {
      const setupElement = document.getElementById('setup-section');
      if (setupElement) {
        // Calculate offset to account for sticky tabs (59px + some padding)
        const stickyTabsHeight = 135; // 59px + some padding
        const elementTop = setupElement.offsetTop;
        const offsetPosition = elementTop - stickyTabsHeight;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      }
    }, 100);
  };

  const selectDistrict = (districtId: string) => {
    setIsSetupTabActive(false);
    setIsSetupSectionExpanded(false); // Collapse setup section when selecting a district
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
          const stickyTabsHeight = 135; // 59px + some padding
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

  const handleQuestAction = async (quest: Quest) => {
    const currentStatus = getQuestStatus(quest);
    if (currentStatus === 'completed') return;

    try {
      // Get user addresses for POAP verification
      const userAddresses = address ? [address] : [];

      // Execute the quest action based on condition type and values
      const isCompleted = await executeQuestAction(
        quest.id.toString(),
        quest.conditionType as any, // Type assertion for QuestConditionType
        quest.conditionValues,
        userAddresses
      );

      // For groupId 1 (Setup & app tour), also open links if conditionValues is a URL or path
      if (quest.conditionType === 'isLinkVisited' && quest.conditionValues) {
        if (quest.conditionValues.startsWith('http')) {
          // Open external link in new tab
          window.open(quest.conditionValues, '_blank', 'noopener,noreferrer');
        } else if (quest.conditionValues.startsWith('/')) {
          // Navigate to internal route
          router.push(quest.conditionValues);
        }
      }

      if (isCompleted) {
        // Update quest status to completed if the action was successful
        updateQuestStatus(quest.id.toString(), 'completed', false);
      } else {
        // Quest action failed - you might want to show an error message
        // alert(`Quest action failed for quest ${quest.id}: ${quest.name}`);
      }
    } catch (error) {
      // Handle any errors that occur during quest action execution
      console.error(
        `Error executing quest action for quest ${quest.id}:`,
        error
      );
    }
  };

  const handleAboutClick = (quest: Quest) => {
    setShowSupporterInfo(quest);
  };

  const handleSupporterInfoClose = () => {
    setShowSupporterInfo(null);
  };

  const handleSupporterInfoBack = () => {
    setShowSupporterInfo(null);
  };

  const handleViewQuestLocation = (quest: Quest) => {
    router.push(`/map?filter=defi-aave`);
    setShowSupporterInfo(null);
  };

  // Reset function to clear all quest states for App Showcase and Setup quests
  const handleReset = () => {
    // Reset App Showcase quests (groupId === 4) and Setup quests (groupId === 1)
    const appShowcaseQuestIds = appShowcaseQuests.map((quest) =>
      quest.id.toString()
    );
    const setupQuestIds = setupQuests.map((quest) => quest.id.toString());
    const allQuestIds = [...appShowcaseQuestIds, ...setupQuestIds];
    const newQuestStates = { ...questStates };

    allQuestIds.forEach((questId) => {
      delete newQuestStates[questId];
    });

    // Update all quest states at once
    Object.keys(newQuestStates).forEach((questId) => {
      updateQuestStatus(questId, 'locked', true);
    });

    // Reset all quests to locked state
    allQuestIds.forEach((questId) => {
      updateQuestStatus(questId, 'locked', true);
    });
  };

  // Calculate setup quests progress
  const setupProgress = useMemo(() => {
    const completed = setupQuests.filter((quest) => {
      const questState = questStates[quest.id.toString()];
      return questState?.status === 'completed';
    }).length;

    return {
      completed,
      total: setupQuests.length,
      percentage:
        setupQuests.length > 0 ? (completed / setupQuests.length) * 100 : 0,
    };
  }, [setupQuests, questStates]);

  // Calculate overall progress (setup + app showcase)
  const overallProgress = useMemo(() => {
    const allQuests = [...setupQuests, ...appShowcaseQuests];
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
  }, [setupQuests, appShowcaseQuests, questStates]);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col justify-start items-start relative bg-[#f6fafe]">
      {/* SupporterInfo Modal */}
      {showSupporterInfo && (
        <div className="fixed inset-0 z-51 flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleSupporterInfoClose}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-md rounded-t-lg shadow-lg">
            <SupporterInfo
              onClose={handleSupporterInfoClose}
              onBack={handleSupporterInfoBack}
              hideBackButton={true}
              buttonText="View Quest Location"
              onButtonClick={() => handleViewQuestLocation(showSupporterInfo)}
              supporterName={
                showSupporterInfo.supporterId
                  ? getSupporterById(showSupporterInfo.supporterId)?.name ||
                    'Unknown'
                  : 'Quest'
              }
              supporterDescription={
                showSupporterInfo.instructions ||
                (showSupporterInfo.supporterId
                  ? getSupporterById(showSupporterInfo.supporterId)
                      ?.description || 'Complete this quest to earn points'
                  : 'Complete this quest to earn points')
              }
              supporterLogo={
                showSupporterInfo.supporterId
                  ? getSupporterById(showSupporterInfo.supporterId)?.logo
                  : undefined
              }
              category="Quest"
            />
          </div>
        </div>
      )}
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
          top: pwa === true ? '108px' : '48px', // PWA mode: 108px, regular mode: 59px
          transform: 'translate3d(0, 0, 0)', // Force hardware acceleration for smooth rendering
        }}
      >
        <div className="max-w-2xl mx-auto">
          <Tabs
            districts={districtsWithQuests}
            activeDistrictId={expandedDistrict}
            onDistrictSelect={selectDistrict}
            showSetupTab={true}
            isSetupTabActive={isSetupTabActive}
            isSetupSectionExpanded={isSetupSectionExpanded}
            onSetupTabSelect={selectSetupTab}
          />
        </div>
        {/* Reward Section */}
        <div className="bg-white border-gray-200 w-full px-4 pb-4">
          <div className="flex flex-col gap-2">
            {/* <div className="flex flex-col gap-1">
              <h2 className="text-base font-bold text-gray-800 tracking-[-0.1px]">
                Complete 10 quests
              </h2>
              <p className="text-sm text-gray-600">
                <span className="font-bold">Reward:</span>{' '}
                <span className="font-normal">Spin the Prize Wheel!</span>
              </p>
            </div> */}
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
                {[10, 30, 50, 83].map((milestone, index) => {
                  // Only show milestone if it's less than or equal to the total quests
                  if (milestone <= overallProgress.total) {
                    const isCompleted = overallProgress.completed >= milestone;
                    const size = isCompleted ? 32 : 24;
                    return (
                      <div
                        key={milestone}
                        className="absolute"
                        style={{
                          left: `calc(${(milestone / overallProgress.total) * 100}% - ${size / 2}px)`,
                          top: `${isCompleted ? '-10.5px' : `-${size / 3}px`}`,
                          width: `${size}px`,
                          height: `${size}px`,
                        }}
                      >
                        <div
                          className="flex items-center justify-center"
                          style={{
                            width: `${size}px`,
                            height: `${size}px`,
                          }}
                        >
                          <div
                            style={{
                              width: `${size}px`,
                              height: `${size}px`,
                            }}
                          >
                            {isCompleted ? (
                              <Image
                                src="/images/icons/star-completed.svg"
                                alt="Completed milestone"
                                width={size}
                                height={size}
                                className="w-full h-full"
                              />
                            ) : (
                              <Image
                                src="/images/icons/star.svg"
                                alt="Milestone"
                                width={size}
                                height={size}
                                className="w-full h-full"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Setup & app tour Section */}
      <div className="w-full py-3">
        <div id="setup-section" className="bg-white border border-gray-200">
          {/* Setup Section Header - Clickable */}
          <button
            onClick={toggleSetupSectionExpansion}
            className="w-full p-4 text-left hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800 tracking-[-0.1px] mb-2">
                  Setup & app tour
                </h3>
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-medium text-gray-600 tracking-[-0.1px]">
                    {setupProgress.completed}/{setupProgress.total} completed
                  </div>
                  <div className="w-full h-2 bg-blue-50 rounded">
                    <div
                      className="h-2 bg-blue-600 rounded"
                      style={{ width: `${setupProgress.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center w-4 h-4 mx-auto mt-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={`transform transition-transform ${
                  isSetupSectionExpanded ? 'rotate-180' : ''
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

          {/* Setup Quest List - Only show when section is expanded */}
          {isSetupSectionExpanded && (
            <div className="px-4 pb-4 space-y-3">
              {setupQuests.map((quest) => {
                const isCompleted = isQuestCompleted(quest);

                return (
                  <div
                    key={quest.id}
                    ref={(el) => {
                      questRefs.current[quest.id] = el;
                    }}
                    className="bg-white border border-[#e2e2e9] rounded"
                  >
                    <div className="flex items-start gap-3 p-4">
                      {/* Quest Icon */}
                      <div className="w-6 h-6 flex-shrink-0">
                        {quest.supporterId ? (
                          (() => {
                            const supporter = getSupporterById(
                              quest.supporterId
                            );
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
                          {isCompleted && (
                            <div className="w-6 h-6 flex-shrink-0 ml-2">
                              {quest.poapImageLink ? (
                                <img
                                  src={quest.poapImageLink}
                                  alt="POAP"
                                  className="w-full h-full object-cover rounded-full"
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
                          <div
                            data-icon="false"
                            data-state="default"
                            data-type="Secondary"
                            className="w-full bg-[#eaf3fa] border border-white rounded px-3 
                          py-3 text-sm font-bold text-[#36364c] tracking-[-0.1px] hover:bg-
                          [#d4e7f5] transition-colors shadow-[0px_4px_0px_0px_#595978] cursor-pointer"
                            onClick={() => handleQuestAction(quest)}
                          >
                            <div className="text-center justify-start text-[#36364c] text-sm font-bold font-['Roboto'] leading-[14px]">
                              {quest.button || 'Verify'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* District Sections */}
      <div className="w-full space-y-3 py-3 bg-[#f6fafe]">
        {filteredDistricts.map((district) => {
          const quests = questsByDistrict[district.id] || [];
          const progress = getDistrictProgress(district.id);
          const isDistrictExpanded = expandedDistrict === district.id;

          return (
            <div
              key={district.id}
              id={`district-${district.id}`}
              className="border border-gray-200"
              style={{
                backgroundImage: `linear-gradient(90deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.7) 100%), ${district.backgroundColor || 'linear-gradient(0deg, rgb(170, 167, 255) 0%, rgb(246, 180, 14) 100%)'}`,
              }}
            >
              {/* District Header - Clickable */}
              <button
                onClick={() => toggleDistrictExpansion(district.id)}
                className="w-full p-4 text-left hover:bg-white/20 transition-colors cursor-pointer"
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
                </div>
                <div className="flex items-center justify-center w-4 h-4 mx-auto mt-2">
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
                        ref={(el) => {
                          questRefs.current[quest.id] = el;
                        }}
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
                                      handleQuestAction(quest);
                                    }
                                  : undefined
                              }
                            >
                              <div className="w-10 h-10 rounded-full flex items-center justify-center relative">
                                <img
                                  src={
                                    quest.poapImageLink ||
                                    'https://images.reactbricks.com/original/a77a7ed1-cb3e-4b3b-98d5-865a66629009.svg'
                                  }
                                  alt="POAP"
                                  width={40}
                                  height={40}
                                  className={`w-full h-full object-cover rounded-full ${isCompleted ? '' : 'grayscale opacity-50'}`}
                                />
                              </div>
                              <div className="text-center w-14">
                                {isCompleted ? (
                                  <span className="text-green-600 text-[10px] font-bold">
                                    COLLECTED
                                  </span>
                                ) : (
                                  <p
                                    className="text-[#4B4B66] text-[10px] font-normal leading-none tracking-[0.1px] hover:text-blue-800 transition-colors"
                                    style={{ fontFamily: 'Roboto, sans-serif' }}
                                  >
                                    TO DO
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Quest Actions */}
                        {isExpanded && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <div className="bg-[#daebfb] box-border content-stretch flex flex-col items-center justify-center p-4 relative rounded-bl-[2px] rounded-br-[2px] size-full">
                              <div className="content-stretch flex gap-3 items-center relative shrink-0 w-full">
                                <div className="basis-0 bg-[#eaf3fa] box-border content-stretch flex gap-2 grow items-center justify-center min-h-px min-w-px p-3 relative rounded-[1px] shrink-0">
                                  <div
                                    aria-hidden="true"
                                    className="absolute border border-solid border-white inset-0 pointer-events-none rounded-[1px] shadow-[0px_4px_0px_0px_#595978]"
                                  />
                                  <button
                                    onClick={() => handleAboutClick(quest)}
                                    className="font-['Roboto:Bold',_sans-serif] font-bold leading-[0] relative shrink-0 text-[#44445d] text-sm text-center text-nowrap w-full"
                                    style={{
                                      fontVariationSettings: "'wdth' 100",
                                    }}
                                  >
                                    <p className="leading-none whitespace-pre">
                                      About
                                    </p>
                                  </button>
                                  <div className="absolute inset-0 pointer-events-none shadow-[0px_4px_6px_0px_inset_#f3f8fc,0px_-3px_6px_0px_inset_#f3f8fc]" />
                                </div>
                                {!isCompleted && (
                                  <div className="basis-0 bg-[#1b6fae] box-border content-stretch flex gap-2 grow items-center justify-center min-h-px min-w-px p-3 relative rounded-[1px] shadow-[0px_4px_0px_0px_#125181] shrink-0">
                                    <button
                                      onClick={() => handleQuestAction(quest)}
                                      className="font-['Roboto:Bold',_sans-serif] font-bold leading-[0] relative shrink-0 text-sm text-center text-nowrap text-white w-full"
                                      style={{
                                        fontVariationSettings: "'wdth' 100",
                                      }}
                                    >
                                      <p className="leading-none whitespace-pre">
                                        Verify
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
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Reset Button */}
      <div className="w-full px-4 pb-4">
        <button
          onClick={handleReset}
          className="w-full bg-white border border-[#e0e0e0] rounded-lg px-4 py-3 text-[#36364c] font-medium hover:bg-gray-50 hover:border-[#d0d0d0] transition-colors"
        >
          Reset All Progress
        </button>
      </div>
    </div>
  );
}
