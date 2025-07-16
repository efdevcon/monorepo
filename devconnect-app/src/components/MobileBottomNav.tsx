'use client';

import React from 'react';
import { useAccountContext } from '@/context/account-context';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/utils/nav-items';

export default function MobileBottomNav() {
  const { account } = useAccountContext();
  const pathname = usePathname();

  if (!account) return null;

  const selectedItem = NAV_ITEMS.find((item) => item.href === pathname);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center bg-white border-t border-gray-200 pb-[34px] pt-[4px]"
      style={{
        background: selectedItem?.backgroundColor,
        backdropFilter: 'blur(8px)',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/' && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <a
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center flex-1 py-1 gap-1 text-xs transition-colors ${isActive ? 'text-[#232336] font-semibold' : 'text-[#4b4b66] font-normal'}`}
          >
            <span className="size-7 flex items-center justify-center overflow-hidden">
              <Icon active={isActive} />
            </span>
            <span className="text-[10px] leading-[10px] font-['Roboto']">
              {item.label}
            </span>
          </a>
        );
      })}
    </nav>
  );
} 
