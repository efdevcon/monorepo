'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from 'usehooks-ts';
import PageLayout from '@/components/PageLayout';
import QuestGroupDetail from '../QuestGroupDetail';
import { questGroupsData } from '@/data/questGroups';
import { NAV_ITEMS } from '@/config/nav-items';

const navItem = NAV_ITEMS.find((item) => item.href === '/quests');
const navLabel = navItem?.label || 'Quests';
const title = navLabel;

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Local storage for quest status and locked state
  const [questStates, setQuestStates] = useLocalStorage<
    Record<string, {
      status: 'completed' | 'active' | 'locked';
      is_locked: boolean;
      isCheckedIn?: boolean;
    }>
  >('quest-states', {});

  // Function to update quest status
  const updateQuestStatus = (
    questId: string,
    status: 'completed' | 'active' | 'locked',
    is_locked: boolean,
    isCheckedIn?: boolean
  ) => {
    setQuestStates((prev) => ({
      ...prev,
      [questId]: {
        ...prev[questId],
        status,
        is_locked,
        ...(isCheckedIn !== undefined && { isCheckedIn }),
      },
    }));
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
        questStates={questStates}
        updateQuestStatus={updateQuestStatus}
      />
    </PageLayout>
  );
}
