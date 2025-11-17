'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from 'usehooks-ts';
import PageLayout from '@/components/PageLayout';
import AppShowcaseDetail, {
  type AppShowcaseDetailHandle,
} from './AppShowcaseDetail';
import ComingSoonMessage from '@/components/ComingSoonMessage';
import { questGroupsData } from '@/data/questGroups';
import { NAV_ITEMS } from '@/config/nav-items';
import { hasEarlyAccess } from '@/utils/cookies';
import Image from 'next/image';
import { useQuestCompletions } from '@/app/store.hooks';
import { useQuestProgress } from '@/hooks/useQuestProgress';
import { QUEST_STATE_VERSION } from '@/config/config';

const navItem = NAV_ITEMS.find((item) => item.href === '/quests');
const navLabel = navItem?.label || 'Quests';
const title = navLabel;

export default function QuestsPage() {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const appShowcaseDetailRef = useRef<AppShowcaseDetailHandle>(null);

  // Check if early access is enabled
  const hasEarlyAccessCookie = hasEarlyAccess();

  // Local storage for quest status with version control
  const [questStates, setQuestStates] = useLocalStorage<{
    version: number;
    data: Record<
      string,
      {
        status: 'completed' | 'active' | 'locked';
        completedAt?: number;
      }
    >;
  }>('quest-states', { version: QUEST_STATE_VERSION, data: {} });

  // Track if we just performed a migration (to prevent immediate DB sync)
  const justMigrated = useRef(false);

  // Check version and reset if necessary
  // Handles migration from ANY old format to versioned format
  useEffect(() => {
    try {
      // Validate structure: must be an object with version and data
      const isValidStructure =
        questStates &&
        typeof questStates === 'object' &&
        !Array.isArray(questStates) &&
        typeof questStates.version === 'number' &&
        questStates.data &&
        typeof questStates.data === 'object';

      const isCorrectVersion = questStates.version === QUEST_STATE_VERSION;

      if (!isValidStructure || !isCorrectVersion) {
        console.log(
          'Quest state migration needed (old format or wrong version), resetting...'
        );
        justMigrated.current = true;
        setQuestStates({ version: QUEST_STATE_VERSION, data: {} });

        // Clear the migration flag after sync effects have settled
        setTimeout(() => {
          justMigrated.current = false;
        }, 2000);
      }
    } catch (e) {
      // If anything goes wrong reading the state, reset it
      console.error('Error validating quest state, resetting:', e);
      justMigrated.current = true;
      setQuestStates({ version: QUEST_STATE_VERSION, data: {} });

      setTimeout(() => {
        justMigrated.current = false;
      }, 2000);
    }
  }, []);

  // Hook to sync quest completions to database
  const {
    questCompletions: rawQuestCompletions,
    syncQuestStates,
    resetQuestCompletions,
  } = useQuestCompletions();

  // Memoize questCompletions to prevent infinite loops from reference changes
  // Only recreate when the actual keys/values change
  const questCompletions = useMemo(() => {
    return rawQuestCompletions;
  }, [JSON.stringify(rawQuestCompletions)]);

  // Track if we're currently syncing from DB to prevent infinite loop
  const isSyncingFromDB = React.useRef(false);
  // Track if we're currently resetting to prevent re-sync
  const isResetting = React.useRef(false);
  // Track previous DB state to detect resets
  const prevQuestCompletions = React.useRef<Record<string, number> | null>(
    null
  );

  // Sync quest states from database (works across devices)
  // This effect runs whenever questCompletions from the database changes
  // (on initial load, window focus, reconnect, etc. thanks to SWR)
  useEffect(() => {
    // Skip sync if we just migrated (prevents re-populating with old server data)
    if (justMigrated.current) {
      console.log('Skipping DB sync - migration in progress');
      return;
    }

    isSyncingFromDB.current = true;

    setQuestStates((prev) => {
      const updated = { ...prev.data };
      let hasChanges = false;

      const currentCompletions = questCompletions || {};
      const prevCompletions = prevQuestCompletions.current || {};
      const hadPreviousData = Object.keys(prevCompletions).length > 0;
      const hasCurrentData = Object.keys(currentCompletions).length > 0;

      // Case 1: Database has completions - merge them into local
      if (hasCurrentData) {
        Object.entries(currentCompletions).forEach(
          ([questId, dbCompletedAt]) => {
            const localState = prev.data[questId];

            // If quest not in localStorage, add it as completed
            if (!localState) {
              updated[questId] = {
                status: 'completed',
                completedAt: dbCompletedAt,
              };
              hasChanges = true;
            }
            // If quest exists locally but isn't completed, sync from database
            else if (!localState.completedAt) {
              updated[questId] = {
                status: 'completed',
                completedAt: dbCompletedAt,
              };
              hasChanges = true;
            }
            // If both have completedAt, use the most recent one (latest completion wins)
            else if (localState.completedAt < dbCompletedAt) {
              updated[questId] = {
                ...localState,
                status: 'completed',
                completedAt: dbCompletedAt,
              };
              hasChanges = true;
            }
          }
        );
      }

      // Case 2: Database was cleared (reset case)
      // Only clear local state if we previously had DB data and now it's empty
      // This prevents clearing on initial load or when DB is loading
      if (hadPreviousData && !hasCurrentData) {
        Object.keys(prev.data).forEach((questId) => {
          if (prev.data[questId]?.completedAt) {
            updated[questId] = {
              status: 'locked',
            };
            hasChanges = true;
          }
        });
      }

      // Update the previous state tracker
      prevQuestCompletions.current = currentCompletions;

      // Reset the sync flag after a short delay
      setTimeout(() => {
        isSyncingFromDB.current = false;
      }, 100);

      // Only update if there are actual changes to avoid unnecessary re-renders
      return hasChanges ? { ...prev, data: updated } : prev;
    });
  }, [questCompletions]);

  // Function to update quest status
  const updateQuestStatus = (
    questId: string,
    status: 'completed' | 'active' | 'locked'
  ) => {
    setQuestStates((prev) => {
      const newState: {
        status: 'completed' | 'active' | 'locked';
        completedAt?: number;
      } = { status };

      // Add completedAt timestamp when status is completed
      if (status === 'completed') {
        newState.completedAt = Date.now();
      }
      // Remove completedAt when setting to locked (reset)
      // For active state, preserve existing completedAt if any
      else if (status === 'active' && prev.data[questId]?.completedAt) {
        newState.completedAt = prev.data[questId].completedAt;
      }

      return {
        ...prev,
        data: {
          ...prev.data,
          [questId]: newState,
        },
      };
    });
  };

  // Sync quest states to database whenever they change
  // Skip sync if we're currently merging from database or resetting
  useEffect(() => {
    // Don't sync if we're currently receiving updates from DB or resetting
    if (isSyncingFromDB.current || isResetting.current) {
      return;
    }

    const timeoutId = setTimeout(() => {
      syncQuestStates(questStates.data);
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(timeoutId);
  }, [questStates.data, syncQuestStates]);

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
  const questProgressData = useQuestProgress(questStates.data);
  const questProgress = {
    completed: questProgressData.completed,
    total: questProgressData.total,
  };

  // Wrapper for reset that prevents re-sync
  const handleResetWithFlag = async () => {
    isResetting.current = true;
    try {
      // Reset database first
      await resetQuestCompletions();

      // The sync from DB effect will run and see empty {} from database
      // which won't add any quests, effectively clearing the UI
    } finally {
      // Clear the reset flag after a delay to ensure state updates complete
      setTimeout(() => {
        isResetting.current = false;
      }, 2000);
    }
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

  // Show coming soon message if early access is not enabled
  if (!hasEarlyAccessCookie) {
    return (
      <PageLayout
        title={title}
        infoModalContent={questInfoModalContent}
        questProgress={questProgress}
        onQuestProgressClick={handleQuestProgressClick}
      >
        <ComingSoonMessage />
      </PageLayout>
    );
  }

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
        questStates={questStates.data}
        updateQuestStatus={updateQuestStatus}
        resetQuestCompletions={handleResetWithFlag}
      />
    </PageLayout>
  );
}
