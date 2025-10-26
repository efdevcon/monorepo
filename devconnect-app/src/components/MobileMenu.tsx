'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { triggerHaptic } from 'tactus';
import { NAV_ITEMS } from '@/config/nav-items';
import { useWallet } from '@/context/WalletContext';
import css from './MobileMenu.module.scss';
import cn from 'classnames';

export default function Menu() {
  const pathname = usePathname();

  return (
    <>
      {/* Spacer for content to not be hidden behind fixed menu */}
      {/* <div className="md:hidden h-[59px] pointer-events-none" /> */}

      {/*
       * Mobile Navigation Menu - Fixed at Absolute Bottom
       * See: /devconnect-app/IOS_PWA_VIEWPORT_FIX.md
       *
       * The calc formula positions menu at absolute screen bottom (852px on iPhone 14 Pro):
       * - 100vh = 852px (full screen with viewport-fit: cover)
       * - 100dvh = 793px (dynamic viewport / innerHeight)
       * - calc(0px - (100vh - 100dvh)) = calc(0px - 59px) = -59px
       * - This pushes the menu down 59px to reach absolute bottom (no white gap)
       */}
      <nav
        className={cn(
          css['menu'],
          'md:hidden fixed left-0 right-0 z-50',
          'flex justify-center items-center',
          'border-t border-gray-200 gap-2 px-2'
        )}
        style={{
          bottom: '0',
          height: 'calc(59px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {NAV_ITEMS.map((item) => {
          let isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          if (item.isActive) {
            isActive = item.isActive(pathname);
          }

          const Icon = item.icon;
          const isScan = item.label === 'Scan';

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => triggerHaptic(200)}
              className={cn(
                'flex flex-col items-center flex-1 py-1 gap-1',
                'text-xs transition-colors rounded-[2px]',
                isActive ? 'font-bold' : 'font-normal'
              )}
              style={{
                backgroundColor: isActive
                  ? item.backgroundColor
                  : 'transparent',
              }}
            >
              <span
                className={cn(
                  'flex items-center justify-center overflow-hidden',
                  isScan ? 'size-12' : 'size-7'
                )}
              >
                <Icon active={isActive} />
              </span>
              {!isScan && (
                <span
                  className="text-[10px] leading-[10px]"
                  style={{
                    color: isActive ? '#242436' : '#4B4B66',
                  }}
                >
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
