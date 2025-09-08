// import HomeIcon from '@/components/icons/HomeIcon';
import QuestIcon from '@/components/icons/QuestIcon';
import WalletIcon from '@/components/icons/WalletIcon';
import ScanIcon from '@/components/icons/ScanIcon';
import ProgrammeIcon from '@/components/icons/ProgrammeIcon';
// import MapIcon from '@/components/icons/MapIcon';
import { HomeIcon, MapIcon, AwardIcon, UserIcon } from 'lucide-react';

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
    label: 'Home',
    tabItems: [
      {
        label: 'Dashboard',
      },
    ],
    href: '/',
    icon: HomeIcon as any,
    backgroundColor: 'rgba(254, 232, 244, 0.75)',
  },
  {
    label: 'World\'s Fair',
    longLabel: 'Ethereum World\'s Fair',
    href: '/worlds-fair',
    // @ts-ignore
    icon: MapIcon,
    backgroundColor: 'rgba(254, 232, 244, 0.75)',
    tabItems: [
      {
        label: 'Event Schedule',
      },
      // {
      //   label: 'Community',
      // },
      {
        label: 'Venue Map',
      }
    ],
  },
  // {
  //   label: 'Map',
  //   href: '/map',
  //   icon: MapIcon,
  //   backgroundColor: 'rgba(232, 243, 254, 0.75)',
  //   tabItems: [
  //     {
  //       label: 'Dashboard',
  //     },
  //     {
  //       label: 'Wallet',
  //     },
  //     {
  //       label: 'Connections',
  //     },
  //   ],
  // },
  {
    label: 'Scan',
    href: '/scan',
    icon: ScanIcon,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  {
    label: 'Quests',
    href: '/quests',
    // @ts-ignore
    icon: AwardIcon,
    backgroundColor: 'rgba(255, 248, 222, 0.75)',
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
    label: 'Profile',
    href: '/profile',
    // @ts-ignore
    icon: UserIcon,
    backgroundColor: 'rgba(204, 186, 229, 0.75)',
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
      // {
      //   label: 'Profile',
      // },
    ],
  },
  // {
  //   label: 'Profile',
  //   href: '/profile',
  //   icon: ProfileIcon,
  //   backgroundColor: 'rgba(247, 231, 255, 0.75)',
  //   tabItems: [
  //     {
  //       label: 'Profile',
  //     },
  //     {
  //       label: 'Settings',
  //     },
  //   ],
  // },
];

export const navItems = NAV_ITEMS.map(({ label, backgroundColor }) => ({ label, backgroundColor })); 
