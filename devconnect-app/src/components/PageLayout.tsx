'use client';

import React from 'react';
import TabBar from './TabBar';
import { NAV_ITEMS } from '@/utils/nav-items';
import { usePathname } from 'next/navigation';

interface PageLayoutProps {
  title: string;
  children: React.ReactNode;
}

function normalizePath(path: string) {
  return path.replace(/\/$/, '');
}

export default function PageLayout({ title, children }: PageLayoutProps) {
  const pathname = normalizePath(usePathname());
  // Find the current nav item based on the current URL
  const navIndex = NAV_ITEMS.findIndex(
    (item) =>
      pathname === normalizePath(item.href) ||
      (normalizePath(item.href) !== '' && pathname.startsWith(normalizePath(item.href)))
  );
  const navItem = NAV_ITEMS[navIndex];
  const tabItems = navItem?.tabItems;
  // Always select the first tab by default if tabItems exist
  const tabActiveIndex = tabItems && tabItems.length > 0 ? 0 : -1;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center">
      <div
        data-page="Header"
        className="w-[393px] pb-3 relative border-b-[0.50px] backdrop-blur-xs inline-flex flex-col justify-center items-center gap-5 overflow-hidden shadow-[0px_2px_8px_0px_rgba(54,54,76,0.25)]"
        style={{
          background: `radial-gradient(196.3% 65.93% at 98.09% -7.2%, rgba(246, 180, 14, 0.30) 0%, rgba(246, 180, 14, 0.00) 100%),
            radial-gradient(71.21% 71.21% at 50% 71.21%, rgba(36, 36, 54, 0.20) 0%, rgba(36, 36, 54, 0.00) 100%),
            linear-gradient(263deg, rgba(246, 180, 14, 0.30) 2.9%, rgba(45, 45, 66, 0.30) 58.72%, rgba(36, 36, 54, 0.30) 100.39%),
            linear-gradient(98deg, rgba(116, 172, 223, 0.80) -7.48%, rgba(73, 129, 180, 0.80) 43.5%, rgba(255, 133, 166, 0.80) 122.37%)`,
          backgroundBlendMode: 'normal, normal, overlay, normal',
          backdropFilter: 'blur(4px)',
        }}
      >
        <div
          data-background="True"
          className="self-stretch h-[50px] pt-[21px] flex flex-col justify-start items-start"
        >
        </div>
        <div className="w-[353px] h-8 relative inline-flex justify-end items-center gap-3">
          <div className="left-[137px] top-0 absolute text-center justify-start text-white text-lg font-black font-['Unibody_8_Pro'] leading-loose [text-shadow:_0px_2px_0px_rgb(0_0_0_/_0.75)]">
            {title}
          </div>
        </div>
      </div>
      <div className="flex-1 w-full flex flex-col items-center justify-start">
        {tabItems && tabItems.length > 0 && (
          <TabBar navItem={navItem} activeIndex={tabActiveIndex} />
        )}
        {children}
      </div>
    </div>
  );
} 
