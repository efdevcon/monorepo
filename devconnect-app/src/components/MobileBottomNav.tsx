'use client';

import React from 'react';
import { useAccountContext } from '@/context/account-context';
import { usePathname } from 'next/navigation';
import HomeIcon from './icons/HomeIcon';
import QuestIcon from './icons/QuestIcon';
import WalletIcon from './icons/WalletIcon';
import ProgrammeIcon from './icons/ProgrammeIcon';
import ProfileIcon from './icons/ProfileIcon';

const NAV_ITEMS = [
  { label: 'Home', href: '/', icon: HomeIcon },
  { label: 'Quests', href: '/quests', icon: QuestIcon },
  { label: 'Wallet', href: '/wallet', icon: WalletIcon },
  { label: 'Programme', href: '/programme', icon: ProgrammeIcon },
  { label: 'Profile', href: '/profile', icon: ProfileIcon },
];

export default function MobileBottomNav() {
  const { account } = useAccountContext();
  const pathname = usePathname();

  if (!account) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center bg-white border-t border-gray-200"
      style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <a
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center text-xs transition-colors ${isActive ? 'text-blue-600' : 'text-gray-700'}`}
          >
            <Icon active={isActive} />
            <span className={isActive ? 'font-semibold' : ''}>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
} 
