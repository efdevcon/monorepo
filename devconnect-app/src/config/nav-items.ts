import ProgrammeIcon from '@/components/icons/ProgrammeIcon';
import MapIcon from '@/components/icons/MapIcon';
import ScanIcon from '@/components/icons/ScanIcon';
import QuestIcon from '@/components/icons/QuestIcon';
import WalletIcon from '@/components/icons/WalletIcon';
import { createElement } from 'react';
import Icon from '@mdi/react';
import { mdiWallet, mdiImageMultiple, mdiCog } from '@mdi/js';
import { homeTabs } from '@/app/navigation';

// Icon wrapper components for wallet tabs
const WalletTabIcon = ({ color }: { color?: string }) =>
  createElement(Icon, { path: mdiWallet, size: 0.65, color });
const StampbookTabIcon = ({ color }: { color?: string }) =>
  createElement(Icon, { path: mdiImageMultiple, size: 0.65, color });
const SettingsTabIcon = ({ color }: { color?: string }) =>
  createElement(Icon, { path: mdiCog, size: 0.65, color });

export type TabItem = {
  label: string;
  href?: string;
  hide?: boolean;
  icon?: React.ComponentType<any>;
};

export type NavItem = {
  label: string;
  longLabel?: string;
  href: string;
  hasBackButton?: boolean;
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
    tabItems: homeTabs(),
    isActive: (pathname) => {
      return (
        pathname === '/' ||
        pathname.split('/').pop() === 'schedule' ||
        pathname.split('/').pop() === 'tickets' ||
        pathname.split('/').pop() === 'announcements' ||
        pathname.split('/').pop() === 'stages' ||
        pathname.includes('/stages/')
      );
    },
  },
  {
    label: 'Map',
    longLabel: 'La Rural - Venue Map',
    href: '/map',
    icon: MapIcon,
    backgroundColor: 'rgba(116, 172, 223, 0.15)',
  },
  {
    label: 'Scan',
    href: '/scan',
    hasBackButton: true,
    icon: ScanIcon,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  {
    label: 'Quests',
    href: '/quests',
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
        icon: WalletTabIcon,
      },
      {
        label: 'Stampbook',
        href: '/wallet/stampbook',
        icon: StampbookTabIcon,
      },
      {
        label: 'Settings',
        href: '/wallet/settings',
        icon: SettingsTabIcon,
      },
      {
        label: 'Debug',
        href: '/wallet/debug',
        hide: true,
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
