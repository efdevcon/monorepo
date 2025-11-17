'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from 'usehooks-ts';
import PageLayout from '@/components/PageLayout';
import QuestGroupDetail from '../QuestGroupDetail';
import { questGroupsData } from '@/data/questGroups';
import { NAV_ITEMS } from '@/config/nav-items';
import { useQuestCompletions } from '@/app/store.hooks';
import { QUEST_STATE_VERSION } from '@/config/config';

const navItem = NAV_ITEMS.find((item) => item.href === '/quests');
const navLabel = navItem?.label || 'Quests';
const title = navLabel;

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
  const justMigrated = React.useRef(false);
  // Track when migration window closes to trigger re-sync
  const [migrationComplete, setMigrationComplete] = useState(false);

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
          setMigrationComplete(true); // Trigger re-sync
        }, 2000);
      }
    } catch (e) {
      // If anything goes wrong reading the state, reset it
      console.error('Error validating quest state, resetting:', e);
      justMigrated.current = true;
      setQuestStates({ version: QUEST_STATE_VERSION, data: {} });
      
      setTimeout(() => {
        justMigrated.current = false;
        setMigrationComplete(true); // Trigger re-sync
      }, 2000);
    }
  }, []);

  // Hook to sync quest completions to database
  const { questCompletions: rawQuestCompletions, syncQuestStates } =
    useQuestCompletions();

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
      // Ensure prev has the expected structure
      if (!prev || !prev.data) {
        return { version: QUEST_STATE_VERSION, data: {} };
      }

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
            const localState = prev.data?.[questId];

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
        Object.keys(prev.data || {}).forEach((questId) => {
          if (prev.data?.[questId]?.completedAt) {
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
  }, [questCompletions, migrationComplete]); // Re-run when migration completes

  // Function to update quest status
  const updateQuestStatus = (
    questId: string,
    status: 'completed' | 'active' | 'locked'
  ) => {
    setQuestStates((prev) => {
      // Ensure prev has the expected structure
      if (!prev || !prev.data) {
        return { version: QUEST_STATE_VERSION, data: {} };
      }

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
      else if (status === 'active' && prev.data?.[questId]?.completedAt) {
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
      syncQuestStates(questStates?.data || {});
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(timeoutId);
  }, [questStates?.data, syncQuestStates]);

  // Handle back navigation
  const handleBackToGroups = () => {
    router.push('/quests');
  };

  // Load Onboarding group data (group ID 1)
  useEffect(() => {
    const group = questGroupsData.find((g) => g.id === 1); // Onboarding group

    if (group) {
      setSelectedGroup(group);
    } else {
      // Group not found, redirect to quests page
      router.push('/quests');
      return;
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <PageLayout title={title}>
        <div className="w-full max-w-2xl mx-auto flex flex-col justify-start items-start gap-6">
          <div className="text-center">Loading onboarding...</div>
        </div>
      </PageLayout>
    );
  }

  if (!selectedGroup) {
    return (
      <PageLayout title={title}>
        <div className="w-full max-w-2xl mx-auto flex flex-col justify-start items-start gap-6">
          <div className="text-center">Onboarding not found</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={title}>
      <QuestGroupDetail
        group={selectedGroup}
        onBack={handleBackToGroups}
        questStates={questStates?.data || {}}
        updateQuestStatus={updateQuestStatus}
      />
    </PageLayout>
  );
}
