'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import AppShowcaseDetail, {
  type AppShowcaseDetailHandle,
} from './AppShowcaseDetail';
import { questGroupsData } from '@/data/questGroups';
import { NAV_ITEMS } from '@/config/nav-items';
import Image from 'next/image';
import { useQuestCompletions } from '@/app/store.hooks';
import { useQuestProgress } from '@/hooks/useQuestProgress';
import { useUserData } from '@/hooks/useServerData';

const navItem = NAV_ITEMS.find((item) => item.href === '/quests');
const navLabel = navItem?.label || 'Quests';
const title = navLabel;

export default function QuestsPage() {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const appShowcaseDetailRef = useRef<AppShowcaseDetailHandle>(null);

  // Clean up old localStorage keys (one-time migration)
  useEffect(() => {
    try {
      // Remove all old quest-related localStorage keys
      const keysToClean = [
        'quest-states',
        'ls-quest-states',
        'quest-states-v1',
        'quest-states-v2',
      ];
      keysToClean.forEach((key) => {
        localStorage.removeItem(key);
      });
    } catch (e) {
      // Ignore cleanup errors
    }
  }, []);

  // Get quest completions from database (via SWR)
  const { questCompletions, syncQuestStates, resetQuestCompletions } =
    useQuestCompletions();
  const { refresh: refreshUserData } = useUserData();

  // Derive quest states from database completions
  // This is now just a helper to convert DB format to UI format
  const questStates = React.useMemo(() => {
    const states: Record<
      string,
      {
        status: 'completed' | 'active' | 'locked';
        completedAt?: number;
      }
    > = {};

    // Convert DB completions to UI states
    Object.entries(questCompletions || {}).forEach(([questId, completedAt]) => {
      states[questId] = {
        status: 'completed',
        completedAt,
      };
    });

    return states;
  }, [questCompletions]);

  // Function to update quest status with optimistic updates
  const updateQuestStatus = async (
    questId: string,
    status: 'completed' | 'active' | 'locked'
  ) => {
    if (status === 'completed') {
      const completedAt = Date.now();

      // Optimistically update SWR cache for instant UI feedback
      await refreshUserData(
        async (currentData) => {
          return {
            success: true,
            data: {
              ...currentData?.data,
              quests: {
                ...currentData?.data?.quests,
                [questId]: completedAt,
              },
            },
          };
        },
        {
          optimisticData: (currentData) => ({
            success: true,
            data: {
              ...currentData?.data,
              quests: {
                ...currentData?.data?.quests,
                [questId]: completedAt,
              },
            },
          }),
          revalidate: false, // Don't revalidate immediately
        }
      );

      // Sync to database - syncQuestStates expects full quest states with status
      const updatedStates: Record<
        string,
        {
          status: 'completed' | 'active' | 'locked';
          completedAt?: number;
        }
      > = {
        ...questStates,
        [questId]: {
          status: 'completed',
          completedAt,
        },
      };

      const result = await syncQuestStates(updatedStates);

      if (!result?.success) {
        console.error(
          '[updateQuestStatus] Failed to sync quest to DB:',
          result?.error
        );
        // Note: We don't show a toast here since the quest actions already handle user feedback
        // The optimistic update means the UI still shows as completed
      }
    }
  };

  // Handle back navigation - not used anymore but keeping for AppShowcaseDetail compatibility
  const handleBackToGroups = () => {
    // No-op since there's no quest list page to go back to
  };

  // Load App Showcase group data
  useEffect(() => {
    const group = questGroupsData.find((g) => g.id === 4); // App Showcase group

    if (group) {
      setSelectedGroup(group);
    } else {
      // Group not found, show error
      console.error('App Showcase group not found');
    }
    setLoading(false);
  }, [router]);

  // Calculate quest progress using shared hook
  const questProgressData = useQuestProgress(questStates || {});
  const questProgress = {
    completed: questProgressData.completed,
    total: questProgressData.total,
  };

  // Reset all quest completions
  const handleResetWithFlag = async () => {
    await resetQuestCompletions();
    // SWR will automatically update and UI will reflect the empty state
  };

  // Handle quest progress click - scroll to progress section
  const handleQuestProgressClick = () => {
    appShowcaseDetailRef.current?.scrollToProgress();
  };

  // Quest info modal content
  const questInfoModalContent = (
    <div className="flex flex-col gap-4 items-start justify-center pb-4 pt-3 px-4 w-full">
      {/* Icon */}
      <div className="w-12 h-12 shrink-0">
        <Image
          src="/images/icons/book-quest-info.svg"
          alt="Quest book icon"
          width={48}
          height={48}
        />
      </div>

      {/* Title and main description */}
      <div className="flex flex-col gap-2 items-start w-full leading-[1.3]">
        <h2 className="text-[#20202b] text-lg font-bold w-full">
          Quests at the Ethereum World's Fair
        </h2>
        <p className="text-[#353548] text-sm font-normal w-full">
          To commemorate the first Ethereum World's Fair, we've created a
          collection of souvenirs, obtainable by completing fun Quests!
        </p>
      </div>

      {/* How to complete quest section */}
      <div className="flex flex-col gap-2 items-start w-full text-[#353548] text-sm">
        <p className="font-bold leading-[1.3] w-full">
          How do I complete a District Quest?
        </p>
        <ol className="list-decimal pl-5 space-y-1 leading-[1.3]">
          <li>Head to the supporters booth</li>
          <li>Complete their Quest & verify with supporter</li>
          <li>Mint their unique Devconnect POAP</li>
          <li>
            Tap <span className="font-bold">'Verify'</span> on their Quest card
            in-app 🎉
          </li>
        </ol>
      </div>

      {/* Prizes section */}
      <div className="flex flex-col gap-2 items-start w-full text-[#353548] text-sm leading-[1.3]">
        <p className="font-bold w-full">Are there prizes?</p>
        <p className="font-normal w-full whitespace-pre-wrap">
          Yes! We'll be distributing prizes to the top collectors throughout the
          week. Keep an eye on the Announcements page for updates 👀🔔
        </p>
      </div>
    </div>
  );

  // if (loading) {
  //   return (
  //     <PageLayout title={title}>
  //       <div className="w-full max-w-2xl mx-auto flex flex-col justify-start items-start gap-6">
  //         <div className="text-center">Loading quests...</div>
  //       </div>
  //     </PageLayout>
  //   );
  // }

  // if (!selectedGroup) {
  //   return (
  //     <PageLayout title={title}>
  //       <div className="w-full max-w-2xl mx-auto flex flex-col justify-start items-start gap-6">
  //         <div className="text-center">Quests not found</div>
  //       </div>
  //     </PageLayout>
  //   );
  // }

  return (
    <PageLayout
      title={title}
      infoModalContent={questInfoModalContent}
      questProgress={questProgress}
      onQuestProgressClick={handleQuestProgressClick}
      needHelpPosition="left"
    >
      <AppShowcaseDetail
        ref={appShowcaseDetailRef}
        group={selectedGroup}
        onBack={handleBackToGroups}
        questStates={questStates || {}}
        updateQuestStatus={updateQuestStatus}
        resetQuestCompletions={handleResetWithFlag}
      />
    </PageLayout>
  );
}
