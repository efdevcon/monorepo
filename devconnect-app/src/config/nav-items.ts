import ProgrammeIcon from '@/components/icons/ProgrammeIcon';
import MapIcon from '@/components/icons/MapIcon';
import ScanIcon from '@/components/icons/ScanIcon';
import QuestIcon from '@/components/icons/QuestIcon';
import WalletIcon from '@/components/icons/WalletIcon';

export type TabItem = {
  label: string;
  href?: string;
  hide?: boolean;
};

export type NavItem = {
  label: string;
  longLabel?: string;
  href: string;
  icon: React.ComponentType<{ active: boolean }>;
  isActive?: (pathname: string) => boolean;
  backgroundColor: string;
  tabItems?: TabItem[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    label: "World's Fair",
    longLabel: "Ethereum World's Fair",
    href: '/',
    icon: ProgrammeIcon,
    backgroundColor: 'rgba(255, 133, 166, 0.15)',
    isActive: (pathname) => {
      return (
        pathname === '/' ||
        pathname.split('/').pop() === 'schedule' ||
        pathname.split('/').pop() === 'tickets'
      );
    },
  },
  {
    label: 'Map',
    longLabel: 'La Rural Map',
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
    href: '/quests/app-showcase',
    icon: QuestIcon,
    backgroundColor: 'rgba(246, 180, 14, 0.15)',
  },
  {
    label: 'Wallet',
    href: '/wallet',
    icon: WalletIcon,
    backgroundColor: 'rgba(136, 85, 204, 0.15)',
    tabItems: [
      {
        label: 'Wallet',
        href: '/wallet',
      },
      {
        label: 'Stampbook',
        href: '/wallet/stampbook',
      },
      {
        label: 'Settings',
        href: '/wallet/settings',
      },
      {
        label: 'Debug',
        href: '/wallet/debug',
      },
      {
        label: 'Onramp',
        href: '/wallet/onramp',
        hide: true,
      },
      {
        label: 'Send',
        href: '/wallet/send',
        hide: true,
      },
    ],
  },
];

export const navItems = NAV_ITEMS.map(({ label, backgroundColor }) => ({
  label,
  backgroundColor,
}));
