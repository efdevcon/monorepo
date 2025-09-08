'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/config/nav-items';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';
import css from './MobileMenu.module.scss';
import cn from 'classnames';

export default function Menu() {
  const { shouldShowNavigation } = useUnifiedConnection();
  const pathname = usePathname();
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

  const selectedItem = NAV_ITEMS.find((item) => item.href === pathname);

  return (
    <>
      {/* Spacer for the bottom of the screen to counteract fixed position of menu */}
      <div
        className="md:hidden pointer-events-none"
        style={{ height: 'calc(72px + max(0px, env(safe-area-inset-bottom)))' }}
      ></div>
      <nav
        className={cn(
          css['menu'],
          'md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center items-center border-t border-gray-200]'
        )}
        style={{
          paddingBottom: 'calc(0px + max(0px, env(safe-area-inset-bottom)))',
          height: 'calc(72px + max(0px, env(safe-area-inset-bottom)))',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          const isScan = item.label === 'Scan';
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center flex-1 py-1 gap-1 text-xs transition-colors ${isActive ? 'text-[#232336] font-semibold' : 'text-[#4b4b66] font-normal'}`}
            >
              <span
                className={`${isScan ? 'size-11' : 'size-7'} flex items-center justify-center overflow-hidden`}
              >
                <Icon active={isActive} />
              </span>
              {!isScan && (
                <span className="text-[10px] leading-[10px]">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
