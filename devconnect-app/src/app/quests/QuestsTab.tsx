'use client';

import QuestItem, { Quest } from '@/components/QuestItem';
import QuestRecap from '@/components/QuestRecap';
import QuestReward from '@/components/QuestReward';

const dummyQuests: Quest[] = [
  {
    number: 1,
    quest_id: 'quest_1',
    type: 'wallet',
    title: 'Create your wallet',
    description:
      'Set up your first Web3 wallet to start your blockchain journey. This will be your digital identity for all future interactions.',
    points: 20,
    action: 'View wallet',
    status: 'completed',
    is_locked: false,
  },
  {
    number: 2,
    quest_id: 'quest_2',
    type: 'ticket',
    title: 'Connect your event ticket',
    description:
      'Scan the QR code on your attendee badge to connect your Devconnect ticket to your wallet.',
    points: 10,
    action: 'Open camera',
    status: 'active',
    is_locked: false,
  },
  {
    number: 3,
    quest_id: 'quest_3',
    type: 'profile',
    title: 'Set up your profile',
    description:
      "Customize your profile with your name, avatar, and social links. Let other attendees know who you are and what you're working on.",
    points: 10,
    action: 'Edit profile',
    status: 'locked',
    is_locked: true,
  },
  {
    number: 4,
    quest_id: 'quest_4',
    type: 'glossary',
    title: 'Visit the Glossary',
    description:
      'Explore our comprehensive glossary of blockchain and Web3 terms. Perfect for newcomers and a great refresher for veterans.',
    points: 20,
    action: 'Browse terms',
    status: 'locked',
    is_locked: true,
  },
  {
    number: 5,
    quest_id: 'quest_5',
    type: 'quiz',
    title: "Complete the 'Crypto Risks' mini-quiz",
    description:
      'Test your knowledge about cryptocurrency risks and security best practices. Learn how to protect your digital assets.',
    points: 50,
    action: 'Start quiz',
    status: 'locked',
    is_locked: true,
  },
  {
    number: 6,
    quest_id: 'quest_6',
    type: 'funds',
    title: 'Add funds to your wallet',
    description:
      'Add some ETH or other supported tokens to your wallet to participate in transactions and interact with dApps.',
    points: 30,
    action: 'Add funds',
    status: 'locked',
    is_locked: true,
  },
];

export default function QuestsTab() {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col justify-start items-start gap-3 items-center">
      <QuestRecap quests={dummyQuests} />
      {dummyQuests.map((quest) => (
        <QuestItem key={quest.quest_id} quest={quest} />
      ))}
      <div className="w-[95px] h-0 border border-[#d2d2de] my-4" />
      <QuestReward />
    </div>
  );
}
