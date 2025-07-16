import HomeIcon from '@/components/icons/HomeIcon';
import QuestIcon from '@/components/icons/QuestIcon';
import WalletIcon from '@/components/icons/WalletIcon';
import ProgrammeIcon from '@/components/icons/ProgrammeIcon';
import ProfileIcon from '@/components/icons/ProfileIcon';

export const NAV_ITEMS = [
  {
    label: 'Home',
    href: '/',
    icon: HomeIcon,
    backgroundColor: 'rgba(232, 243, 254, 0.75)',
  },
  {
    label: 'Quests',
    href: '/quests',
    icon: QuestIcon,
    backgroundColor: 'rgba(255, 248, 222, 0.75)',
  },
  {
    label: 'Wallet',
    href: '/wallet',
    icon: WalletIcon,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  {
    label: 'Programme',
    href: '/programme',
    icon: ProgrammeIcon,
    backgroundColor: 'rgba(254, 232, 244, 0.75)',
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: ProfileIcon,
    backgroundColor: 'rgba(247, 231, 255, 0.75)',
  },
]; 
