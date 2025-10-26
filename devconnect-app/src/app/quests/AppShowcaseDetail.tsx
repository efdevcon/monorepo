'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from 'usehooks-ts';
import { districtsData } from '@/data/districts';
import { questsData } from '@/data/quests';
import { supportersData } from '@/data/supporters';
import type { Quest, QuestAction, QuestGroup } from '@/types';
import { SupporterInfo } from '@/app/map/venue-map/components/SupporterInfo';
import { executeQuestAction } from '@/utils/quest-actions';
import { useWallet } from '@/context/WalletContext';
import PoapModal from '@/components/PoapModal';

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
      completedAt?: number;
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
  const { address } = useWallet();
  const [expandedQuests, setExpandedQuests] = useState<Set<number>>(new Set());
  const [expandedDistrict, setExpandedDistrict] = useState<string>('');
  const [showSupporterInfo, setShowSupporterInfo] = useState<Quest | null>(
    null
  );
  const [isSetupSectionExpanded, setIsSetupSectionExpanded] =
    useState<boolean>(false);
  const hasInitialized = useRef(false);
  const [pwa] = useLocalStorage<boolean | null>('pwa', null);
  const questRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [selectedPoap, setSelectedPoap] = useState<{
    id: number;
    name: string;
    image: string;
    description?: string;
    collected: boolean;
    stampedDate?: string;
  } | null>(null);

  // Helper function to scroll element into view accounting for sticky header
  const scrollToElement = (element: HTMLElement) => {
    // Get the actual sticky header height
    // Header is now: safe-area-inset-top + h1(~24px) + pb-3(12px) = ~99px in PWA, ~36px regular
    const stickyTop = pwa === true ? 61 : 52; // Sticky position from top (updated for new header height)

    // Calculate scroll position
    const elementRect = element.getBoundingClientRect();
    const currentScroll =
      window.pageYOffset || document.documentElement.scrollTop;
    const targetScroll = currentScroll + elementRect.top - stickyTop - 70;

    window.scrollTo({
      top: targetScroll,
      behavior: 'smooth',
    });
  };

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
              scrollToElement(questElement);
            }
          }, 200); // Increased delay to ensure DOM updates are complete
        }
        hasInitialized.current = true;
        return;
      }
    }

    // Default: don't expand anything on first load
    hasInitialized.current = true;
  }, [districtsWithQuests, appShowcaseQuests, expandedDistrict, pwa]);

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

  // Helper function to get completion date (returns ISO string for display)
  const getCompletionDate = (questId: number): string | undefined => {
    const questState = questStates[questId.toString()];
    if (questState?.status === 'completed') {
      // First check if we have POAP metadata with the actual minted date
      try {
        const poapMetadata = JSON.parse(
          localStorage.getItem('poap-metadata') || '{}'
        );
        const metadata = poapMetadata[questId.toString()];
        if (metadata?.mintedOn) {
          // mintedOn could be Unix timestamp (number) or ISO string
          const mintedOn = metadata.mintedOn;
          if (typeof mintedOn === 'number') {
            // Convert Unix timestamp to ISO string
            return new Date(mintedOn * 1000).toISOString();
          }
          // Return the actual POAP minting date as-is if it's already a string
          return mintedOn;
        }
      } catch (e) {
        console.error('Error reading POAP metadata:', e);
      }

      // Fall back to the completedAt timestamp from quest-states
      if (questState.completedAt) {
        return new Date(questState.completedAt).toISOString();
      }

      // If collected but no date available, use current timestamp
      return new Date().toISOString();
    }
    return undefined;
  };

  // Handle POAP image click to show modal or navigate to map
  const handlePoapClick = (quest: Quest, e: React.MouseEvent) => {
    e.stopPropagation();

    const isCompleted = isQuestCompleted(quest);

    // If not completed, navigate to map with supporter filter
    if (!isCompleted) {
      const supporterId = quest.supporterId?.toString();
      if (supporterId && supportersData[supporterId]) {
        const supporter = supportersData[supporterId];
        router.push(`/map?filter=${supporter.layerName}`);
      }
      return;
    }

    // If completed, show modal
    const completedAt = getCompletionDate(quest.id);
    const FALLBACK_IMAGE =
      'https://images.reactbricks.com/original/a77a7ed1-cb3e-4b3b-98d5-865a66629009.svg';

    setSelectedPoap({
      id: quest.id,
      name: quest.name,
      image: quest.poapImageLink || FALLBACK_IMAGE,
      description: quest.instructions || undefined,
      collected: true,
      stampedDate: completedAt,
    });
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
      // Expand the district and collapse any expanded setup section
      setExpandedDistrict(districtId);
      setIsSetupSectionExpanded(false);

      // Find the first uncompleted quest in this district
      const quests = questsByDistrict[districtId] || [];
      const firstUncompletedQuest = quests.find((quest) => {
        const questState = questStates[quest.id.toString()];
        return questState?.status !== 'completed';
      });

      // Auto-expand the first uncompleted quest if found
      if (firstUncompletedQuest) {
        setExpandedQuests(new Set([firstUncompletedQuest.id]));
      } else {
        setExpandedQuests(new Set());
      }
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

      // Find the first uncompleted quest in setup quests
      const firstUncompletedQuest = setupQuests.find((quest) => {
        const questState = questStates[quest.id.toString()];
        return questState?.status !== 'completed';
      });

      // Auto-expand the first uncompleted quest if found
      if (firstUncompletedQuest) {
        setExpandedQuests(new Set([firstUncompletedQuest.id]));
      } else {
        setExpandedQuests(new Set());
      }
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
    const supporterId = quest.supporterId?.toString();
    if (supporterId && supportersData[supporterId]) {
      const supporter = supportersData[supporterId];
      router.push(`/map?filter=${supporter.layerName}`);
    }
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
    <div className="w-full mx-auto flex flex-col gap-1 justify-start items-start relative bg-[#f6fafe] mt-4">
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
                      ?.description || 'Quest instructions missing...'
                  : 'Quest instructions missing...')
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
      {/* <div className="bg-white border-b border-gray-200 w-full px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800 tracking-[-0.1px] flex-1 text-center">
            {group.name}
          </h1>
          <div className="w-5" />
        </div>
      </div> */}
      {/* Setup & app tour Section */}
      <div id="setup-section" className="bg-[#cbdfec] w-full">
        {/* Setup Section Header - Clickable */}
        <button
          onClick={toggleSetupSectionExpansion}
          className="w-full pt-6 pb-1 px-6 text-left cursor-pointer flex flex-col gap-4 items-center"
        >
          <div className="flex gap-3 items-center w-full">
            <div className="flex-1 flex flex-col gap-2">
              <h3 className="text-[20px] font-bold text-[#20202b] tracking-[-0.1px] leading-none">
                Setup & app tour
              </h3>
              <div className="flex flex-col gap-2 w-full">
                <p
                  className="text-xs font-medium text-[#353548] tracking-[-0.1px] leading-[1.2]"
                  style={{ fontFamily: 'Roboto Mono, monospace' }}
                >
                  {setupProgress.completed}/{setupProgress.total} completed
                </p>
                <div className="w-full h-[6px] bg-white overflow-hidden rounded-full">
                  <div
                    className="h-full bg-[#1b6fae]"
                    style={{ width: `${setupProgress.percentage}%` }}
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
                            {quest.instructions ||
                              'Quest instructions missing...'}
                          </p>
                        </div>

                        {/* Completion Status */}
                        {isCompleted && (
                          <div
                            className={`w-6 h-6 flex-shrink-0 ml-2 ${
                              quest.poapImageLink ? 'cursor-pointer' : ''
                            }`}
                            onClick={
                              quest.poapImageLink
                                ? (e) => handlePoapClick(quest, e)
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
      {/* District Sections */}
      {filteredDistricts.map((district) => {
        const quests = questsByDistrict[district.id] || [];
        const progress = getDistrictProgress(district.id);
        const isDistrictExpanded = expandedDistrict === district.id;

        return (
          <div
            key={district.id}
            id={`district-${district.id}`}
            className="w-full"
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.3) 100%), ${district.backgroundColor || 'linear-gradient(0deg, rgb(170, 167, 255) 0%, rgb(246, 180, 14) 100%)'}`,
            }}
          >
            {/* District Header - Clickable */}
            <button
              onClick={() => toggleDistrictExpansion(district.id)}
              className="w-full pt-6 pb-1 px-6 text-left cursor-pointer flex flex-col gap-2 items-center"
            >
              <div className="flex gap-3 items-center w-full">
                <div className="w-14 h-14">
                  <img
                    src={district.logo}
                    alt={district.name}
                    width={56}
                    height={56}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="flex-1 flex flex-col gap-2">
                  <h3 className="text-[20px] font-bold text-[#20202b] tracking-[-0.1px] leading-none">
                    {district.name}
                  </h3>
                  <div className="flex flex-col gap-2 w-full">
                    <p
                      className="text-xs font-medium text-[#353548] tracking-[-0.1px] leading-[1.2]"
                      style={{ fontFamily: 'Roboto Mono, monospace' }}
                    >
                      {progress.completed}/{progress.total} completed
                    </p>
                    <div className="w-full h-[6px] bg-[#f6fafe] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1b6fae]"
                        style={{ width: `${progress.percentage}%` }}
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
                                <span className="text-xs text-gray-600">?</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-gray-800 mb-1">
                              {quest.name}
                            </h4>
                            <p
                              className={`text-xs text-gray-600 leading-[1.3] ${!isExpanded ? 'line-clamp-2' : ''}`}
                            >
                              {quest.instructions ||
                                'Quest instructions missing...'}
                            </p>
                          </div>
                          <div
                            className="flex flex-col items-center gap-2 cursor-pointer"
                            onClick={(e) => handlePoapClick(quest, e)}
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
      {/* Progress Section */}
      <div className="w-full bg-white border-t border-[#eeeeee] p-6">
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-bold text-[#20202b] tracking-[-0.1px] leading-none">
            Progress
          </h3>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between w-full text-sm">
              <p
                className="font-medium text-[#353548] tracking-[-0.1px] leading-none"
                style={{ fontFamily: 'Roboto Mono, monospace' }}
              >
                {overallProgress.completed}/{overallProgress.total} completed
              </p>
              <button
                type="button"
                onClick={() => router.push('/wallet/stampbook')}
                className="font-semibold text-[#0073de] hover:underline cursor-pointer whitespace-nowrap"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                View Stampbook
              </button>
            </div>
            <div className="w-full h-[6px] bg-[#eaf4fb] overflow-hidden">
              <div
                className="h-full bg-[#1b6fae]"
                style={{
                  width: `${overallProgress.total > 0 ? (overallProgress.completed / overallProgress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="w-full px-4 pb-4 bg-white">
        <button
          onClick={handleReset}
          className="w-full bg-white border border-[#e0e0e0] rounded-lg px-4 py-3 text-[#36364c] font-medium hover:bg-gray-50 hover:border-[#d0d0d0] transition-colors"
        >
          Debug: Reset All Progress
        </button>
      </div>
      {/* POAP Modal */}
      {selectedPoap && (
        <PoapModal
          isOpen={!!selectedPoap}
          onClose={() => setSelectedPoap(null)}
          poapData={{
            name: selectedPoap.name,
            image: selectedPoap.image,
            description: selectedPoap.description,
            collected: selectedPoap.collected,
            stampedDate: selectedPoap.stampedDate,
          }}
        />
      )}
    </div>
  );
}
