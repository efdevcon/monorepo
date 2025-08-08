import HomeIcon from '@/components/icons/HomeIcon';
import QuestIcon from '@/components/icons/QuestIcon';
import WalletIcon from '@/components/icons/WalletIcon';
import ProgrammeIcon from '@/components/icons/ProgrammeIcon';
import ProfileIcon from '@/components/icons/ProfileIcon';

export type TabItem = {
  label: string;
};

export type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ active: boolean }>;
  backgroundColor: string;
  tabItems?: TabItem[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Home',
    href: '/',
    icon: HomeIcon,
    backgroundColor: 'rgba(232, 243, 254, 0.75)',
    tabItems: [
      {
        label: 'Dashboard',
      },
      {
        label: 'Wallet',
      },
      {
        label: 'Connections',
      },
    ],
  },
  {
    label: 'Quests',
    href: '/quests',
    icon: QuestIcon,
    backgroundColor: 'rgba(255, 248, 222, 0.75)',
    tabItems: [
      {
        label: 'Quests',
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
    label: 'Scan',
    href: '/scan',
    icon: WalletIcon,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  {
    label: 'Programme',
    href: '/programme',
    icon: ProgrammeIcon,
    backgroundColor: 'rgba(254, 232, 244, 0.75)',
    tabItems: [
      {
        label: 'Programme',
      },
      {
        label: 'World\'s Fair',
      },
      {
        label: 'Favorites',
      }
    ],
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: ProfileIcon,
    backgroundColor: 'rgba(247, 231, 255, 0.75)',
    tabItems: [
      {
        label: 'Profile',
      },
      {
        label: 'Settings',
      },
    ],
  },
];

export const navItems = NAV_ITEMS.map(({ label, backgroundColor }) => ({ label, backgroundColor })); 
