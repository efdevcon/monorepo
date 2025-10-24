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
  const { isConnected } = useWallet();
  const pathname = usePathname();
  const shouldShowNavigation = isConnected || pathname !== '/';
  const hasLoggedHidden = React.useRef(false);

  // Only log once when navigation becomes hidden to avoid spam
  React.useEffect(() => {
    if (!shouldShowNavigation && !hasLoggedHidden.current) {
      console.log('Menu: hiding navigation');
      hasLoggedHidden.current = true;
    } else if (shouldShowNavigation) {
      hasLoggedHidden.current = false; // Reset when navigation becomes visible
    }
  }, [shouldShowNavigation]);

  // Hide navigation until user connects or skips
  // if (!shouldShowNavigation) {
  //   return null;
  // }

  // const selectedItem = NAV_ITEMS.find((item) => item.href === pathname);

  return (
    <>
      {/* Spacer for the bottom of the screen to counteract fixed position of menu */}
      <div
        className="md:hidden pointer-events-none bg-[#74ACDF10]"
        style={{ height: 'calc(59px + max(0px, env(safe-area-inset-bottom)))' }}
      ></div>
      <nav
        className={cn(
          css['menu'],
          'md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center items-center border-t border-gray-200 gap-2 px-2'
        )}
        style={{
          paddingBottom: 'calc(0px + max(0px, env(safe-area-inset-bottom)))',
          height: 'calc(59px + max(0px, env(safe-area-inset-bottom)))',
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
              className={`flex flex-col items-center flex-1 py-1 gap-1 text-xs transition-colors text-transparent rounded-[2px] ${isActive ? 'font-bold' : 'font-normal'}`}
              style={{
                backgroundColor: isActive
                  ? item.backgroundColor
                  : 'transparent',
              }}
            >
              <span
                className={`${isScan ? 'size-12' : 'size-7'} flex items-center justify-center overflow-hidden`}
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
