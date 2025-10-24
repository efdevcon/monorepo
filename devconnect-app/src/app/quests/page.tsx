'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from 'usehooks-ts';
import PageLayout from '@/components/PageLayout';
import AppShowcaseDetail from './AppShowcaseDetail';
import ComingSoonMessage from '@/components/ComingSoonMessage';
import { questGroupsData } from '@/data/questGroups';
import { questsData } from '@/data/quests';
import { NAV_ITEMS } from '@/config/nav-items';
import { hasBetaAccess } from '@/utils/cookies';
import Image from 'next/image';

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

  // Calculate quest progress (Setup & app tour + App Showcase quests)
  const questProgress = React.useMemo(() => {
    // Get all quests from both groups (Setup = 1, App Showcase = 4)
    const setupQuests = questsData.filter((quest) => quest.groupId === 1);
    const appShowcaseQuests = questsData.filter((quest) => quest.groupId === 4);
    const allQuests = [...setupQuests, ...appShowcaseQuests];

    const completed = allQuests.filter((quest) => {
      const questState = questStates[quest.id.toString()];
      return questState?.status === 'completed';
    }).length;

    return {
      completed,
      total: allQuests.length,
    };
  }, [questStates]);

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
          <li>Mint their unique Devconnect ARG POAP</li>
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

  // Show coming soon message if beta mode is enabled
  if (isBetaMode) {
    return (
      <PageLayout
        title={title}
        infoModalContent={questInfoModalContent}
        questProgress={questProgress}
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
    >
      <AppShowcaseDetail
        group={selectedGroup}
        onBack={handleBackToGroups}
        questStates={questStates}
        updateQuestStatus={updateQuestStatus}
      />
    </PageLayout>
  );
}
