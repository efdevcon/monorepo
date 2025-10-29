'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from 'usehooks-ts';
import { districtsData } from '@/data/districts';
import { questsData } from '@/data/quests';
import Icon from '@mdi/react';
import { mdiChevronDown, mdiChevronUp } from '@mdi/js';
import PoapModal from '@/components/PoapModal';
import { hasBetaAccess } from '@/utils/cookies';
import ComingSoonMessage from '@/components/ComingSoonMessage';

// Fallback image for empty POAP links
const FALLBACK_IMAGE =
  'https://images.reactbricks.com/original/a77a7ed1-cb3e-4b3b-98d5-865a66629009.svg';

interface StampCategory {
  id: string;
  name: string;
  total: number;
  collected: number;
  stamps: {
    id: number;
    name: string;
    image: string;
  }[];
}

export default function StampbookTab() {
  const isBetaMode = hasBetaAccess();
  if (isBetaMode) {
    return <ComingSoonMessage />;
  }
  const router = useRouter();
  const [expandedCategory, setExpandedCategory] = useState<string | null>('0'); // First category expanded by default
  const [selectedPoap, setSelectedPoap] = useState<{
    id: number;
    name: string;
    image: string;
    description?: string;
    collected: boolean;
    stampedDate?: string;
  } | null>(null);

  // Get quest states from local storage (same as in AppShowcaseDetail)
  const [questStates] = useLocalStorage<
    Record<
      string,
      {
        status: 'completed' | 'active' | 'locked';
        is_locked: boolean;
        isCheckedIn?: boolean;
        completedAt?: number; // Timestamp when completed
      }
    >
  >('quest-states', {});

  // Helper function to check if a quest is completed
  const isQuestCompleted = (questId: number): boolean => {
    const questState = questStates[questId.toString()];
    return questState?.status === 'completed';
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

  const toggleCategory = (categoryId: string) => {
    // If clicking the already expanded category, collapse it
    // Otherwise, open the clicked category (closing any other)
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const handlePoapClick = (stamp: {
    id: number;
    name: string;
    image: string;
  }) => {
    const isCompleted = isQuestCompleted(stamp.id);

    // If not claimed/completed, navigate to the quest detail page
    if (!isCompleted) {
      router.push(`/quests#${stamp.id}`);
      return;
    }

    // If claimed/completed, show the modal
    const quest = questsData.find((q) => q.id === stamp.id);
    const completedAt = getCompletionDate(stamp.id);

    setSelectedPoap({
      ...stamp,
      description: quest?.instructions || undefined,
      collected: isCompleted,
      stampedDate: completedAt,
    });
  };

  // Build categories: First one hardcoded, then districts
  const categories: StampCategory[] = useMemo(() => {
    // Get quest 28 (Devconnect POAP)
    const devconnectQuest = questsData.find((quest) => quest.id === 28);

    const cats: StampCategory[] = [
      // Hardcoded first category - Devconnect ARG (using quest id 28)
      {
        id: '0',
        name: 'Devconnect ARG',
        total: 1,
        collected: devconnectQuest ? (isQuestCompleted(28) ? 1 : 0) : 0,
        stamps: devconnectQuest
          ? [
              {
                id: 28,
                name: devconnectQuest.name,
                image: devconnectQuest.poapImageLink || FALLBACK_IMAGE,
              },
            ]
          : [],
      },
    ];

    // Add districts as categories
    Object.entries(districtsData).forEach(([districtId, district]) => {
      const questsInDistrict = questsData.filter(
        (quest) => quest.districtId === districtId
      );

      if (questsInDistrict.length > 0) {
        // Calculate how many quests in this district are completed
        const completedCount = questsInDistrict.filter((quest) =>
          isQuestCompleted(quest.id)
        ).length;

        cats.push({
          id: districtId,
          name: district.name,
          total: questsInDistrict.length,
          collected: completedCount,
          stamps: questsInDistrict.map((quest) => ({
            id: quest.id,
            name: quest.name,
            image: quest.poapImageLink || FALLBACK_IMAGE,
          })),
        });
      }
    });

    return cats;
  }, [questStates]); // Recalculate when quest states change

  return (
    <div
      className="w-full flex-1 py-4 sm:py-5 px-4 sm:px-6 pb-6"
      style={{
        background:
          'linear-gradient(0deg, rgba(246, 182, 19, 0.15) 6.87%, rgba(255, 133, 166, 0.15) 14.79%, rgba(152, 148, 255, 0.15) 22.84%, rgba(116, 172, 223, 0.15) 43.68%, rgba(238, 247, 255, 0.15) 54.97%), #FFF',
      }}
    >
      {/* Content */}
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-[#20202b] text-[22px] font-bold leading-[1.2] tracking-[-0.1px]">
            My World's Fair Stampbook
          </h1>
          <p className="text-[#353548] text-[15px] leading-[1.3] tracking-[-0.1px]">
            Complete Quests at the World's Fair to collect!
          </p>
        </div>

        {/* Categories */}
        <div className="space-y-3">
          {categories.map((category, index) => {
            const isExpanded = expandedCategory === category.id;
            const isLast = index === categories.length - 1;

            return (
              <div
                key={category.id}
                className={isLast ? '' : 'border-b border-[#e0e0eb]'}
              >
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className={`w-full flex items-center gap-2 pb-3 ${
                    isExpanded ? 'border-b border-[#e0e0eb]' : ''
                  } hover:opacity-80 transition-opacity cursor-pointer`}
                >
                  <div className="flex-1 flex items-center gap-2 text-[18px] leading-[1.3]">
                    <span className="flex-1 text-left text-[#353548] font-bold">
                      {category.name}
                    </span>
                    <span className="text-[#4b4b66] font-normal whitespace-nowrap text-right">
                      {category.collected}/{category.total}
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <Icon
                      path={isExpanded ? mdiChevronUp : mdiChevronDown}
                      size={0.8}
                      className="text-[#0073de]"
                    />
                  </div>
                </button>

                {/* Category Content */}
                {isExpanded && category.stamps.length > 0 && (
                  <div className="py-4">
                    <div className="grid grid-cols-3 gap-4">
                      {category.stamps.map((stamp) => {
                        const isCompleted = isQuestCompleted(stamp.id);
                        return (
                          <button
                            key={stamp.id}
                            onClick={() => handlePoapClick(stamp)}
                            className="flex flex-col items-center justify-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <div className="relative w-20 h-20 overflow-hidden flex items-center justify-center">
                              <img
                                src={stamp.image}
                                alt={stamp.name}
                                className={`w-full h-full object-cover rounded-full ${
                                  isCompleted ? '' : 'grayscale opacity-50'
                                }`}
                                onError={(e) => {
                                  // Fallback if image fails to load
                                  e.currentTarget.src = FALLBACK_IMAGE;
                                }}
                              />
                            </div>
                            <p
                              className={`text-[#353548] text-[14px] leading-none text-center w-[106px] ${
                                isCompleted ? 'font-bold' : 'font-normal'
                              }`}
                            >
                              {stamp.name}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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

