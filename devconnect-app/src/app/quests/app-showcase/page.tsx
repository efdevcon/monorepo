'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from 'usehooks-ts';
import PageLayout from '@/components/PageLayout';
import AppShowcaseDetail from '../AppShowcaseDetail';
import { questGroupsData } from '@/data/questGroups';
import { NAV_ITEMS } from '@/config/nav-items';

const navItem = NAV_ITEMS.find((item) => item.href === '/quests');
const navLabel = navItem?.label || 'Quests';
const title = navLabel;

export default function AppShowcasePage() {
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

  // Load App Showcase group data
  useEffect(() => {
    const group = questGroupsData.find((g) => g.id === 4); // App Showcase group
    
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
          <div className="text-center">Loading app showcase...</div>
        </div>
      </PageLayout>
    );
  }

  if (!selectedGroup) {
    return (
      <PageLayout title={title}>
        <div className="w-full max-w-2xl mx-auto flex flex-col justify-start items-start gap-6">
          <div className="text-center">App showcase not found</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={title}>
      <AppShowcaseDetail
        group={selectedGroup}
        onBack={handleBackToGroups}
        questStates={questStates}
        updateQuestStatus={updateQuestStatus}
      />
    </PageLayout>
  );
}
