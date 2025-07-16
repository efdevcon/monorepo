'use client';
import React from 'react';
import type { NavItem, TabItem } from '@/utils/nav-items';

interface TabBarProps {
  navItem: NavItem;
  activeIndex: number;
  onTabClick?: (item: TabItem, index: number) => void;
}

export default function TabBar({ navItem, activeIndex, onTabClick }: TabBarProps) {
  const tabItems = navItem.tabItems || [];
  const bgColor = navItem.backgroundColor || '#e8f3fb';
  return (
    <div className="p-1 inline-flex justify-center items-center rounded" style={{ background: bgColor }}>
      {tabItems.map((item, idx) => (
        <button
          key={item.label}
          type="button"
          className={
            idx === activeIndex
              ? 'px-3 py-1.5 rounded-[1px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] flex justify-center items-center'
              : 'px-3 py-1.5 rounded-xs flex justify-center items-center'
          }
          style={{
            outline: 'none',
            border: 'none',
            background: idx === activeIndex ? '#fff' : 'transparent',
          }}
          onClick={() => onTabClick?.(item, idx)}
        >
          <div
            className={
              'text-center justify-center text-sm font-medium font-[\'Roboto\'] leading-tight ' +
              (idx === activeIndex ? 'text-[#232336]' : 'text-[#4b4b66]')
            }
          >
            {item.label}
          </div>
        </button>
      ))}
    </div>
  );
} 
