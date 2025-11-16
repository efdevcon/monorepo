'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { districtsData } from '@/data/districts';
import { questsData } from '@/data/quests';
import { supportersData } from '@/data/supporters';
import type { Quest, QuestGroup } from '@/types';
import MapPane from '@/app/(page-layout)/map/venue-map/components/panes';
import { executeQuestAction } from '@/utils/quest-actions';
import { useWallet } from '@/context/WalletContext';
import PoapModal from '@/components/PoapModal';
import { useTickets } from '@/app/store.hooks';
import { triggerHaptic } from 'tactus';
import {
  scrollToElement,
  triggerDistrictConfetti,
  calculateProgress,
} from './utils/quest-helpers';
import InfoCard from './components/InfoCard';
import SetupSection from './components/SetupSection';
import CryptoPaymentSection from './components/CryptoPaymentSection';
import DistrictSection from './components/DistrictSection';
import ProgressSection from './components/ProgressSection';

interface AppShowcaseDetailProps {
  group: QuestGroup;
  onBack: () => void;
  questStates: Record<
    string,
    {
      status: 'completed' | 'active' | 'locked';
      completedAt?: number;
    }
  >;
  updateQuestStatus: (
    questId: string,
    status: 'completed' | 'active' | 'locked'
  ) => void;
  resetQuestCompletions: () => Promise<void>;
}

export interface AppShowcaseDetailHandle {
  scrollToProgress: () => void;
}

const AppShowcaseDetail = React.forwardRef<
  AppShowcaseDetailHandle,
  AppShowcaseDetailProps
>(function AppShowcaseDetail(
  {
    group,
    onBack,
    questStates,
    updateQuestStatus,
    resetQuestCompletions,
  }: AppShowcaseDetailProps,
  ref
) {
  const router = useRouter();
  const { para, eoa, address } = useWallet();
  const { tickets } = useTickets();
  const [expandedQuests, setExpandedQuests] = useState<Set<number>>(new Set());
  const [expandedDistrict, setExpandedDistrict] = useState<string>('');
  const [selectedSupporter, setSelectedSupporter] = useState<string | null>(
    null
  );
  const [verifyingQuestId, setVerifyingQuestId] = useState<string | null>(null);
  const [isSetupSectionExpanded, setIsSetupSectionExpanded] =
    useState<boolean>(false);
  const [isCryptoPaymentSectionExpanded, setIsCryptoPaymentSectionExpanded] =
    useState<boolean>(false);
  const hasInitialized = useRef(false);
  const questRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const setupSectionRef = useRef<HTMLDivElement | null>(null);
  const cryptoPaymentSectionRef = useRef<HTMLDivElement | null>(null);
  const districtRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const progressSectionRef = useRef<HTMLDivElement | null>(null);
  const [selectedPoap, setSelectedPoap] = useState<{
    id: number;
    name: string;
    image: string;
    description?: string;
    collected: boolean;
    stampedDate?: string;
  } | null>(null);

  // Expose scrollToProgress method to parent via ref
  React.useImperativeHandle(ref, () => ({
    scrollToProgress: () => {
      if (progressSectionRef.current) {
        scrollToElement(progressSectionRef.current, true);
      }
    },
  }));

  // Get all App Showcase quests (groupId === 4)
  const appShowcaseQuests = questsData.filter((quest) => quest.groupId === 4);

  // Get all Setup & app tour quests (groupId === 1)
  const setupQuests = questsData
    .filter((quest) => quest.groupId === 1)
    .sort((a, b) => a.order - b.order);

  // Get all Crypto payment quests (groupId === 2)
  const cryptoPaymentQuests = questsData
    .filter((quest) => quest.groupId === 2)
    .sort((a, b) => a.order - b.order);

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

      // Check if it's a quest ID from any group
      const allQuests = [
        ...appShowcaseQuests,
        ...setupQuests,
        ...cryptoPaymentQuests,
      ];
      const quest = allQuests.find((q) => q.id.toString() === hash);

      if (quest) {
        // Check if it's an app showcase quest (has districtId)
        if (quest.groupId === 4) {
          const questDistrict = districtsWithQuests.find(
            (d) => d.id === quest.districtId?.toString()
          );
          if (questDistrict) {
            setExpandedDistrict(questDistrict.id);
            setExpandedQuests(new Set([quest.id]));

            // Scroll to the quest after a delay
            setTimeout(() => {
              const questElement = questRefs.current[quest.id];
              if (questElement) {
                scrollToElement(questElement);
              }
            }, 200);
          }
        }
        // Check if it's a setup quest (groupId === 1)
        else if (quest.groupId === 1) {
          setIsSetupSectionExpanded(true);
          setExpandedQuests(new Set([quest.id]));

          // Scroll to the quest after a delay
          setTimeout(() => {
            const questElement = questRefs.current[quest.id];
            if (questElement) {
              scrollToElement(questElement);
            }
          }, 200);
        }
        // Check if it's a crypto payment quest (groupId === 2)
        else if (quest.groupId === 2) {
          setIsCryptoPaymentSectionExpanded(true);
          setExpandedQuests(new Set([quest.id]));

          // Scroll to the quest after a delay
          setTimeout(() => {
            const questElement = questRefs.current[quest.id];
            if (questElement) {
              scrollToElement(questElement);
            }
          }, 200);
        }

        hasInitialized.current = true;
        return;
      }
    }

    // Default: don't expand anything on first load
    hasInitialized.current = true;
  }, [
    districtsWithQuests,
    appShowcaseQuests,
    setupQuests,
    cryptoPaymentQuests,
    expandedDistrict,
  ]);

  // Use all districts since we're not filtering anymore
  const filteredDistricts = districtsWithQuests;

  // Calculate progress for a district
  const getDistrictProgress = (districtId: string) => {
    const quests = questsByDistrict[districtId] || [];
    return calculateProgress(quests, questStates);
  };

  // Calculate setup progress
  const setupProgress = calculateProgress(setupQuests, questStates);

  // Calculate crypto payment progress
  const cryptoPaymentProgress = calculateProgress(
    cryptoPaymentQuests,
    questStates
  );

  // Calculate overall progress
  // Note: Order matters for consistency - Setup, Crypto Payment, App Showcase
  const overallProgress = useMemo(() => {
    const allQuests = [
      ...setupQuests,
      ...cryptoPaymentQuests,
      ...appShowcaseQuests,
    ];
    return calculateProgress(allQuests, questStates);
  }, [setupQuests, cryptoPaymentQuests, appShowcaseQuests, questStates]);

  // Get quest status
  const getQuestStatus = (quest: Quest) => {
    const questState = questStates[quest.id.toString()];
    return questState?.status || 'locked';
  };

  const isQuestCompleted = (quest: Quest) => {
    const questState = questStates[quest.id.toString()];
    return !!questState?.completedAt; // Quest is completed if completedAt exists
  };

  // Helper function to get completion date (returns ISO string for display)
  const getCompletionDate = (questId: number): string | undefined => {
    const questState = questStates[questId.toString()];
    if (questState?.completedAt) {
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
      return new Date(questState.completedAt).toISOString();
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

      // Scroll to the district section after collapse
      setTimeout(() => {
        const districtElement = districtRefs.current[districtId];
        if (districtElement) {
          scrollToElement(districtElement, true);
        }
      }, 100);
    } else {
      // Expand the district and collapse any expanded setup section or crypto payment section
      setExpandedDistrict(districtId);
      setIsSetupSectionExpanded(false);
      setIsCryptoPaymentSectionExpanded(false);

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

      // Scroll to the district section after expansion
      setTimeout(() => {
        const districtElement = districtRefs.current[districtId];
        if (districtElement) {
          scrollToElement(districtElement, true);
        }
      }, 100);
    }
  };

  const toggleSetupSectionExpansion = () => {
    const isCurrentlyExpanded = isSetupSectionExpanded;

    if (isCurrentlyExpanded) {
      // Collapse the setup section
      setIsSetupSectionExpanded(false);
      setExpandedQuests(new Set());

      // Scroll to the setup section after collapse
      setTimeout(() => {
        if (setupSectionRef.current) {
          scrollToElement(setupSectionRef.current, true);
        }
      }, 100);
    } else {
      // Expand the setup section and collapse any expanded district or crypto payment section
      setIsSetupSectionExpanded(true);
      setExpandedDistrict(''); // Collapse any expanded district
      setIsCryptoPaymentSectionExpanded(false); // Collapse crypto payment section

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

      // Scroll to the setup section after expansion
      setTimeout(() => {
        if (setupSectionRef.current) {
          scrollToElement(setupSectionRef.current, true);
        }
      }, 100);
    }
  };

  const toggleCryptoPaymentSectionExpansion = () => {
    const isCurrentlyExpanded = isCryptoPaymentSectionExpanded;

    if (isCurrentlyExpanded) {
      // Collapse the crypto payment section
      setIsCryptoPaymentSectionExpanded(false);
      setExpandedQuests(new Set());

      // Scroll to the crypto payment section after collapse
      setTimeout(() => {
        if (cryptoPaymentSectionRef.current) {
          scrollToElement(cryptoPaymentSectionRef.current, true);
        }
      }, 100);
    } else {
      // Expand the crypto payment section and collapse any expanded district or setup section
      setIsCryptoPaymentSectionExpanded(true);
      setExpandedDistrict(''); // Collapse any expanded district
      setIsSetupSectionExpanded(false); // Collapse setup section

      // Find the first uncompleted quest in crypto payment quests
      const firstUncompletedQuest = cryptoPaymentQuests.find((quest) => {
        const questState = questStates[quest.id.toString()];
        return questState?.status !== 'completed';
      });

      // Auto-expand the first uncompleted quest if found
      if (firstUncompletedQuest) {
        setExpandedQuests(new Set([firstUncompletedQuest.id]));
      } else {
        setExpandedQuests(new Set());
      }

      // Scroll to the crypto payment section after expansion
      setTimeout(() => {
        if (cryptoPaymentSectionRef.current) {
          scrollToElement(cryptoPaymentSectionRef.current, true);
        }
      }, 100);
    }
  };

  const handleQuestAction = async (quest: Quest) => {
    triggerHaptic(200);
    if (isQuestCompleted(quest)) return;

    try {
      // Get all connected wallet addresses (both Para and EOA)
      const userAddresses = [para.address, eoa.address].filter(
        (addr): addr is string => !!addr
      );

      // Execute the quest action based on condition type and values
      const isCompleted = await executeQuestAction(
        quest.id.toString(),
        quest.conditionType as any, // Type assertion for QuestConditionType
        quest.conditionValues,
        userAddresses,
        tickets,
        quest.supporterId
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
        updateQuestStatus(quest.id.toString(), 'completed');

        // Trigger confetti and set verifying state
        setVerifyingQuestId(quest.id.toString());
        triggerDistrictConfetti(
          quest.districtId?.toString(),
          quest.id.toString(),
          () => setVerifyingQuestId(null)
        );
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
    const supporterId = quest.supporterId?.toString();

    if (!supporterId) {
      return;
    }

    const supporter = supportersData[supporterId];
    if (!supporter) {
      return;
    }

    if (!supporter.layerName) {
      return;
    }

    setSelectedSupporter(supporter.layerName);
  };

  // Reset function to clear all quest states for App Showcase, Setup, and Crypto Payment quests
  const handleReset = async () => {
    // Reset local UI states first
    setExpandedQuests(new Set());
    setExpandedDistrict('');
    setIsSetupSectionExpanded(false);
    setIsCryptoPaymentSectionExpanded(false);

    // If we were on a specific quest/district, clear the hash
    if (window.location.hash) {
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search
      );
    }

    // Reset quest completions in database
    // The parent component's sync effect will handle clearing localStorage
    // when it sees the empty database response
    try {
      await resetQuestCompletions();
    } catch (error) {
      console.error('Failed to reset quest completions in database:', error);
    }
  };

  return (
    <div className="flex flex-col items-center w-full h-full overflow-y-auto bg-white">
      {selectedSupporter && (
        <MapPane
          selection={selectedSupporter}
          setSelection={setSelectedSupporter}
          fromQuests={true}
        />
      )}

      {/* Info Card: Using wallets to complete Quests */}
      <InfoCard />

      {/* Setup & app tour Section */}
      <div className="w-full pb-1">
        <SetupSection
          ref={setupSectionRef}
          setupQuests={setupQuests}
          isExpanded={isSetupSectionExpanded}
          progress={setupProgress}
          isQuestCompleted={isQuestCompleted}
          verifyingQuestId={verifyingQuestId}
          address={address || undefined}
          onQuestAction={handleQuestAction}
          onAboutClick={handleAboutClick}
          onPoapClick={handlePoapClick}
          onToggleExpansion={toggleSetupSectionExpansion}
          questRefs={questRefs}
        />
      </div>

      {/* Crypto Payment Section */}
      <div className="w-full pb-1">
        <CryptoPaymentSection
          ref={cryptoPaymentSectionRef}
          cryptoPaymentQuests={cryptoPaymentQuests}
          isExpanded={isCryptoPaymentSectionExpanded}
          progress={cryptoPaymentProgress}
          expandedQuests={expandedQuests}
          isQuestCompleted={isQuestCompleted}
          verifyingQuestId={verifyingQuestId}
          address={address || undefined}
          onQuestAction={handleQuestAction}
          onAboutClick={handleAboutClick}
          onPoapClick={handlePoapClick}
          onToggleExpansion={toggleCryptoPaymentSectionExpansion}
          onToggleQuestExpansion={toggleQuestExpansion}
          questRefs={questRefs}
        />
      </div>

      {/* District Sections */}
      {filteredDistricts.map((district) => {
        const quests = questsByDistrict[district.id] || [];
        const progress = getDistrictProgress(district.id);
        const isDistrictExpanded = expandedDistrict === district.id;

        return (
          <div key={district.id} className="w-full pb-1">
            <DistrictSection
              ref={(el) => {
                districtRefs.current[district.id] = el;
              }}
              district={district}
              quests={quests}
              isExpanded={isDistrictExpanded}
              progress={progress}
              expandedQuests={expandedQuests}
              isQuestCompleted={isQuestCompleted}
              verifyingQuestId={verifyingQuestId}
              address={address || undefined}
              onQuestAction={handleQuestAction}
              onAboutClick={handleAboutClick}
              onPoapClick={handlePoapClick}
              onToggleDistrictExpansion={toggleDistrictExpansion}
              onToggleQuestExpansion={toggleQuestExpansion}
              questRefs={questRefs}
            />
          </div>
        );
      })}

      {/* Progress Section */}
      <ProgressSection
        ref={progressSectionRef}
        progress={overallProgress}
        onViewStampbook={() => router.push('/wallet/stampbook')}
        onReset={handleReset}
      />

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
});

export default AppShowcaseDetail;
