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
  // Track if we're currently resetting to prevent re-sync
  const isResetting = React.useRef(false);
  // Track previous DB state to detect resets
  const prevQuestCompletions = React.useRef<Record<string, number> | null>(null);

  // Sync quest states from database (works across devices)
  // This effect runs whenever questCompletions from the database changes
  // (on initial load, window focus, reconnect, etc. thanks to SWR)
  useEffect(() => {
    isSyncingFromDB.current = true;
    
    setQuestStates((prev) => {
      const updated = { ...prev };
      let hasChanges = false;

      const currentCompletions = questCompletions || {};
      const prevCompletions = prevQuestCompletions.current || {};
      const hadPreviousData = Object.keys(prevCompletions).length > 0;
      const hasCurrentData = Object.keys(currentCompletions).length > 0;

      // Case 1: Database has completions - merge them into local
      if (hasCurrentData) {
        Object.entries(currentCompletions).forEach(([questId, dbCompletedAt]) => {
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
      }
      
      // Case 2: Database was cleared (reset case)
      // Only clear local state if we previously had DB data and now it's empty
      // This prevents clearing on initial load or when DB is loading
      if (hadPreviousData && !hasCurrentData) {
        Object.keys(prev).forEach((questId) => {
          if (prev[questId]?.completedAt) {
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
      return hasChanges ? updated : prev;
    });
  }, [questCompletions, setQuestStates]);

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
      else if (status === 'active' && prev[questId]?.completedAt) {
        newState.completedAt = prev[questId].completedAt;
      }
      
      return {
        ...prev,
        [questId]: newState,
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
