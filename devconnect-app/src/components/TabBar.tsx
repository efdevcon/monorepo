'use client';
import React from 'react';
import type { NavItem, TabItem } from '@/config/nav-items';
import cn from 'classnames';

interface TabBarProps {
  navItem: NavItem;
  activeIndex: number;
  onTabClick?: (item: TabItem, index: number) => void;
  showScrollArrows?: boolean;
}

export default function TabBar({
  navItem,
  activeIndex,
  onTabClick,
  showScrollArrows = false,
}: TabBarProps) {
  const tabItems = navItem.tabItems || [];
  // const bgColor = navItem.backgroundColor || '#e8f3fb';

  return (
    <div
      className={`mt-3 p-1 inline-flex justify-center md:justify-start items-center rounded bg-[#EFEFF5] ${
        showScrollArrows ? 'min-w-full' : 'mx-auto md:mx-0'
      }`}
      // style={{ background: bgColor }}
    >
      {tabItems.map((item, idx) => (
        <button
          key={item.label}
          type="button"
          data-tab-index={idx}
          className={
            idx === activeIndex
              ? 'cursor-pointer px-3 py-1.5 rounded-[1px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] flex justify-center items-center whitespace-nowrap flex-shrink-0'
              : 'cursor-pointer px-3 py-1.5 rounded-xs flex justify-center items-center whitespace-nowrap flex-shrink-0'
          }
          style={{
            outline: 'none',
            border: 'none',
            background: idx === activeIndex ? '#fff' : 'transparent',
            minWidth: showScrollArrows ? '120px' : 'auto',
          }}
          onClick={() => onTabClick?.(item, idx)}
        >
          <div
            className={
              'text-center justify-center text-sm font-medium leading-tight ' +
              (idx === activeIndex
                ? 'text-[#232336]'
                : 'text-[#4b4b66] cursor-pointer')
            }
          >
            {item.label}
          </div>
        </button>
      ))}
    </div>
  );
}
