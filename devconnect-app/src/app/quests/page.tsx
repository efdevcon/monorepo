'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from 'usehooks-ts';
import PageLayout from '@/components/PageLayout';
import AppShowcaseDetail from './AppShowcaseDetail';
import ComingSoonMessage from '@/components/ComingSoonMessage';
import { questGroupsData } from '@/data/questGroups';
import { NAV_ITEMS } from '@/config/nav-items';
import { hasBetaAccess } from '@/utils/cookies';

const navItem = NAV_ITEMS.find((item) => item.href === '/quests');
const navLabel = navItem?.label || 'Quests';
const title = navLabel;

export default function QuestsPage() {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Check if beta mode is enabled (hide for beta users)
  const isBetaMode = hasBetaAccess();

  // Local storage for quest status and locked state
  const [questStates, setQuestStates] = useLocalStorage<
    Record<
      string,
      {
        status: 'completed' | 'active' | 'locked';
        is_locked: boolean;
        isCheckedIn?: boolean;
        completedAt?: number;
      }
    >
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
        // Add completedAt timestamp when status is completed
        ...(status === 'completed' && { completedAt: Date.now() }),
      },
    }));
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

  // Show coming soon message if beta mode is enabled
  if (isBetaMode) {
    return (
      <PageLayout title={title}>
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
