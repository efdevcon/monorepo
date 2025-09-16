import ProgrammeIcon from '@/components/icons/ProgrammeIcon';
import MapIcon from '@/components/icons/MapIcon';
import ScanIcon from '@/components/icons/ScanIcon';
import QuestIcon from '@/components/icons/QuestIcon';
import WalletIcon from '@/components/icons/WalletIcon';

export type TabItem = {
  label: string;
};

export type NavItem = {
  label: string;
  longLabel?: string;
  href: string;
  icon: React.ComponentType<{ active: boolean }>;
  backgroundColor: string;
  tabItems?: TabItem[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'World\'s Fair',
    longLabel: 'Ethereum World\'s Fair',
    href: '/worlds-fair',
    icon: ProgrammeIcon,
    backgroundColor: 'rgba(255, 133, 166, 0.15)',
  },
  {
    label: 'Map',
    href: '/map',
    icon: MapIcon,
    backgroundColor: 'rgba(116, 172, 223, 0.15)',
  },
  {
    label: 'Scan',
    href: '/scan',
    icon: ScanIcon,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  {
    label: 'Quests',
    href: '/quests',
    icon: QuestIcon,
    backgroundColor: 'rgba(246, 180, 14, 0.15)',
    tabItems: [
      {
        label: 'Onboarding Level 1',
      },
      {
        label: 'Onboarding Level 2',
      },
      {
        label: 'Onboarding Level 3',
      },
      {
        label: 'DeFi',
      },
      {
        label: 'L2s',
      },
      {
        label: 'Social',
      },
      {
        label: 'Rewards',
      },
      {
        label: 'Leaderboard',
      },
    ],
  },
  {
    label: 'Wallet',
    href: '/wallet',
    icon: WalletIcon,
    backgroundColor: 'rgba(136, 85, 204, 0.15)',
    tabItems: [
      {
        label: 'Wallet',
      },
      {
        label: 'Onramp',
      },
      {
        label: 'Tickets',
      },
    ],
  },
];

export const navItems = NAV_ITEMS.map(({ label, backgroundColor }) => ({ label, backgroundColor })); 
