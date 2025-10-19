'use client';

import { useState, useMemo } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { districtsData } from '@/data/districts';
import { questsData } from '@/data/quests';
import Icon from '@mdi/react';
import { mdiChevronDown, mdiChevronUp } from '@mdi/js';
import PoapModal from '@/components/PoapModal';

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

  // Helper function to get completion date
  const getCompletionDate = (questId: number): string | undefined => {
    const questState = questStates[questId.toString()];
    if (questState?.status === 'completed' && questState.completedAt) {
      return new Date(questState.completedAt).toISOString();
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
    // Find the quest data for this stamp to get description
    const quest = questsData.find((q) => q.id === stamp.id);
    const isCompleted = isQuestCompleted(stamp.id);
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
    const cats: StampCategory[] = [
      // Hardcoded first category - Devconnect ARG (id: 0 is special)
      {
        id: '0',
        name: 'Devconnect ARG',
        total: 1,
        collected: 0, // This is a special hardcoded POAP, not tracked in quest states
        stamps: [
          {
            id: 0,
            name: 'Devconnect Arg',
            image: FALLBACK_IMAGE,
          },
        ],
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
    <div className="bg-[#f6fafe] min-h-screen w-full">
      {/* Content */}
      <div className="px-5 pt-6 pb-6 space-y-6">
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
          {categories.map((category) => {
            const isExpanded = expandedCategory === category.id;

            return (
              <div key={category.id} className="space-y-0">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full bg-white border border-[#f0f0f4] rounded-[2px] px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[#20202b] text-base font-bold tracking-[-0.1px]">
                      {category.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#4b4b66] text-base font-normal tracking-[-0.1px]">
                      {category.collected}/{category.total}
                    </span>
                    <Icon
                      path={isExpanded ? mdiChevronUp : mdiChevronDown}
                      size={0.8}
                      className="text-[#0073de]"
                    />
                  </div>
                </button>

                {/* Category Content */}
                {isExpanded && category.stamps.length > 0 && (
                  <div className="bg-white border-x border-b border-[#f0f0f4] rounded-b-[2px] p-4">
                    <div className="grid grid-cols-3 gap-4">
                      {category.stamps.map((stamp) => {
                        const isCompleted = isQuestCompleted(stamp.id);
                        return (
                          <button
                            key={stamp.id}
                            onClick={() => handlePoapClick(stamp)}
                            className="flex flex-col items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                              <img
                                src={stamp.image}
                                alt={stamp.name}
                                className={`w-full h-full object-cover ${
                                  isCompleted ? '' : 'grayscale opacity-50'
                                }`}
                                onError={(e) => {
                                  // Fallback if image fails to load
                                  e.currentTarget.src = FALLBACK_IMAGE;
                                }}
                              />
                            </div>
                            <p
                              className={`text-[#353548] text-xs text-center tracking-[-0.1px] leading-[1.3] max-w-[106px] line-clamp-2 ${
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

