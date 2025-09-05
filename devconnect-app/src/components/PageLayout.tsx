'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import WorldsFairLogo from '@/images/worlds-fair-logo.png';
import { NAV_ITEMS } from '@/config/nav-items';
import Link from 'next/link';
import cn from 'classnames';
import { useRouter } from 'next/navigation';
// import { sessionIdAtom } from '@/store/sessionId';
import { ArrowBigLeft, Blend as AppIcon } from 'lucide-react';
import Menu from '@/components/MobileMenu';

interface TabItem {
  label: string;
  labelIcon?: React.ComponentType<any>;
  component: React.ComponentType<any>;
}

interface PageLayoutProps {
  title: string;
  children?: React.ReactNode;
  tabs?: TabItem[];
}

interface TabsProps {
  tabs?: TabItem[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}

const BackButton = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (history.state.key && !sessionId) {
      setSessionId(history.state.key);

      return;
    }
  }, [sessionId, setSessionId]);

  const canBack =
    typeof window !== 'undefined' && history.state?.key !== sessionId;

  const handleBackClick = () => {
    if (canBack) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <div
      className={cn(
        'lg:w-[30px] flex w-[20px] justify-start items-center text-xl shrink-0 transition-all duration-300',
        canBack && 'hover:scale-110'
      )}
    >
      {canBack ? (
        <button
          onClick={handleBackClick}
          className="flex items-center cursor-pointer select-none"
        >
          <ArrowBigLeft
            style={{
              fontSize: 16,
              // transform: 'rotateY(180deg)', // Apply 180-degree rotation on the X-axis
            }}
          />
        </button>
      ) : (
        <AppIcon style={{ fontSize: 20 }} />
      )}
    </div>
  );
};

const Tabs = ({ tabs = [], activeIndex, setActiveIndex }: TabsProps) => {
  return (
    <div
      className={`py-4 md:py-2 flex items-center md:rounded overflow-auto w-full`}
    >
      <div className="flex bg-[#EFEFF5] md:rounded w-[fit-content] shrink-0 flex p-1">
        {tabs.map((tab, idx) => (
          <button
            key={tab.label}
            type="button"
            data-tab-index={idx}
            className={cn(
              'shrink-0cursor-pointer px-3 py-1.5 flex justify-center items-center whitespace-nowrap flex-shrink-0',
              idx === activeIndex
                ? 'rounded-[1px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]'
                : 'rounded-xs',
              tab.labelIcon && 'pl-2'
            )}
            style={{
              outline: 'none',
              border: 'none',
              background: idx === activeIndex ? '#fff' : 'transparent',
              minWidth: 'auto',
            }}
            onClick={() => setActiveIndex(idx)}
          >
            <div
              className={cn(
                'text-center justify-center text-sm font-medium leading-tight flex gap-1.5',
                idx === activeIndex
                  ? 'text-[#232336]'
                  : 'text-[#4b4b66] cursor-pointer'
              )}
            >
              {tab.labelIcon && <tab.labelIcon size={18} />}
              {tab.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default function PageLayout({
  title,
  children,
  tabs = [],
}: PageLayoutProps) {
  const pathname = usePathname();
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTab = tabs[activeIndex];

  return (
    <>
      {/* Mobile layout */}
      <div className="relative md:hidden" data-type="layout-mobile">
        <div
          data-page="Header"
          className="w-full shrink-0 relative backdrop-blur-xs flex flex-col  items-start px-4 gap-5 sticky top-0 z-[999999]"
          style={{
            background: `radial-gradient(196.3% 65.93% at 98.09% -7.2%, rgba(246, 180, 14, 0.30) 0%, rgba(246, 180, 14, 0.00) 100%),
            radial-gradient(71.21% 71.21% at 50% 71.21%, rgba(36, 36, 54, 0.20) 0%, rgba(36, 36, 54, 0.00) 100%),
            linear-gradient(263deg, rgba(246, 180, 14, 0.30) 2.9%, rgba(45, 45, 66, 0.30) 58.72%, rgba(36, 36, 54, 0.30) 100.39%),
            linear-gradient(98deg, rgba(116, 172, 223, 0.80) -7.48%, rgba(73, 129, 180, 0.80) 43.5%, rgba(255, 133, 166, 0.80) 122.37%)`,
            backgroundBlendMode: 'normal, normal, overlay, normal',
            backdropFilter: 'blur(4px)',
            paddingTop: 'calc(0px + max(0px, env(safe-area-inset-top)))',
          }}
        >
          <div className="relative flex items-center gap-3 text-white text-lg font-bold h-[59px]">
            <BackButton />
            {title}
          </div>
        </div>

        {tabs.length > 1 && (
          <div
            className="px-4 text-lg font-bold border-b border-b-solid border-[#8855CC26] sticky bg-white md:rounded-t-sm z-[999998]"
            style={{
              top: 'calc(59px + max(0px, env(safe-area-inset-top)))',
            }}
          >
            <Tabs
              tabs={tabs}
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
            />
          </div>
        )}

        {/* Do not use padding left/right here, it will reduce flexibility for children that need to reach the edges of the screen */}
        <div className="w-full flex flex-col items-center justify-start grow">
          {activeTab.component && (
            <activeTab.component activeIndex={activeIndex} />
          )}
        </div>
      </div>

      <Menu />

      {/* Desktop layout */}
      <div
        className="hidden md:flex flex-col items-center justify-center my-8"
        data-type="layout-desktop"
      >
        <div className="section relative">
          <div className="relative w-full flex gap-5 h-[fit-content]">
            <div
              className="items-center w-[160px] shrink-0 self-stretch"
              data-type="layout-desktop-left-nav"
            >
              <div className="flex flex-col sticky top-4 items-center gap-4">
                <Image
                  src={WorldsFairLogo}
                  alt="Worlds Fair Logo"
                  className="w-auto h-[45px]"
                />

                <div className="flex flex-col gap-2 border border-solid border-[#EFEFF5] self-start p-3 w-[160px] rounded-sm">
                  {NAV_ITEMS.filter((item) => item.label !== 'Scan').map(
                    (item) => {
                      const isActive =
                        pathname === item.href ||
                        (item.href !== '/' && pathname.startsWith(item.href));
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'p-1.5 px-2 text-sm flex hover:bg-[#74ACDF26] gap-2 items-center rounded',
                            isActive && 'bg-[#74ACDF26] font-semibold'
                          )}
                        >
                          <item.icon
                            // @ts-ignore
                            size={18}
                            color={isActive ? '#232336' : '#4B4B66'}
                          />
                          {item.label}
                        </Link>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col flex-1 mb-8">
              <div className="h-[45px] my-2 ml-6 text-lg font-bold">
                {title}
              </div>
              <div className="flex-1 border border-solid border-[#8855CC26] rounded-sm h-[fit-content] relative">
                {tabs.length > 1 && (
                  <div className="px-4 py-2 text-lg font-bold border-b border-b-solid border-[#8855CC26] w-full sticky top-0 bg-white rounded-t-sm z-[100]">
                    <Tabs
                      tabs={tabs}
                      activeIndex={activeIndex}
                      setActiveIndex={setActiveIndex}
                    />
                  </div>
                )}
                {/* Do not use padding left/right here, it will reduce flexibility for children that need to reach the edges of the screen */}
                <div className="overflow-auto">
                  {activeTab.component && (
                    <activeTab.component activeIndex={activeIndex} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
