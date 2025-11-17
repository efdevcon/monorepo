'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import QuestGroupDetail from '../QuestGroupDetail';
import { questGroupsData } from '@/data/questGroups';
import { NAV_ITEMS } from '@/config/nav-items';
import { useQuestCompletions } from '@/app/store.hooks';
import { useUserData } from '@/hooks/useServerData';

const navItem = NAV_ITEMS.find((item) => item.href === '/quests');
const navLabel = navItem?.label || 'Quests';
const title = navLabel;

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Get quest completions from database (via SWR)
  const { questCompletions, syncQuestStates } = useQuestCompletions();
  const { refresh: refreshUserData } = useUserData();

  // Derive quest states from database completions
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

      // Sync to database in the background
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

      await syncQuestStates(updatedStates);
    }
  };

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
        questStates={questStates || {}}
        updateQuestStatus={updateQuestStatus}
      />
    </PageLayout>
  );
}
