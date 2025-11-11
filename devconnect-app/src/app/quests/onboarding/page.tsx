'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from 'usehooks-ts';
import PageLayout from '@/components/PageLayout';
import QuestGroupDetail from '../QuestGroupDetail';
import { questGroupsData } from '@/data/questGroups';
import { NAV_ITEMS } from '@/config/nav-items';
import { useQuestCompletions } from '@/app/store.hooks';

const navItem = NAV_ITEMS.find((item) => item.href === '/quests');
const navLabel = navItem?.label || 'Quests';
const title = navLabel;

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Local storage for quest status
  const [questStates, setQuestStates] = useLocalStorage<
    Record<
      string,
      {
        status: 'completed' | 'active' | 'locked';
        completedAt?: number;
      }
    >
  >('quest-states', {});

  // Hook to sync quest completions to database
  const { questCompletions, syncQuestStates } = useQuestCompletions();

  // Track if we're currently syncing from DB to prevent infinite loop
  const isSyncingFromDB = React.useRef(false);

  // Sync quest states from database (works across devices)
  // This effect runs whenever questCompletions from the database changes
  // (on initial load, window focus, reconnect, etc. thanks to SWR)
  useEffect(() => {
    if (questCompletions && Object.keys(questCompletions).length > 0) {
      isSyncingFromDB.current = true;

      setQuestStates((prev) => {
        const updated = { ...prev };
        let hasChanges = false;

        Object.entries(questCompletions).forEach(([questId, dbCompletedAt]) => {
          const localState = prev[questId];

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
        });

        // Reset the sync flag after a short delay
        setTimeout(() => {
          isSyncingFromDB.current = false;
        }, 100);

        // Only update if there are actual changes to avoid unnecessary re-renders
        return hasChanges ? updated : prev;
      });
    }
  }, [questCompletions, setQuestStates]);

  // Function to update quest status
  const updateQuestStatus = (
    questId: string,
    status: 'completed' | 'active' | 'locked'
  ) => {
    setQuestStates((prev) => ({
      ...prev,
      [questId]: {
        ...prev[questId],
        status,
        // Add completedAt timestamp when status is completed
        ...(status === 'completed' && { completedAt: Date.now() }),
      },
    }));
  };

  // Sync quest states to database whenever they change
  // Skip sync if we're currently merging from database to prevent infinite loop
  useEffect(() => {
    // Don't sync if we're currently receiving updates from DB
    if (isSyncingFromDB.current) {
      return;
    }

    const timeoutId = setTimeout(() => {
      syncQuestStates(questStates);
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(timeoutId);
  }, [questStates, syncQuestStates]);

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
        questStates={questStates}
        updateQuestStatus={updateQuestStatus}
      />
    </PageLayout>
  );
}
