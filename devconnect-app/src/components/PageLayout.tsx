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
import { ArrowBigLeft, Blend as AppIcon, Undo2 } from 'lucide-react';
import Menu from '@/components/MobileMenu';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useIsScrolled } from 'lib/hooks/useIsScrolled';

interface TabItem {
  label: string;
  labelIcon?: React.ComponentType<any>;
  component: React.ComponentType<any>;
  href?: string;
  isActive?: (pathname: string) => boolean;
}

interface PageLayoutProps {
  title?: string;
  children?: React.ReactNode;
  tabs?: TabItem[];
  activeIndex?: number;
  setActiveIndex?: (index: number) => void;
  onTabClick?: (tabItem: any, index: number) => void;
}

interface TabsProps {
  tabs?: TabItem[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  onTabClick?: (tabItem: any, index: number) => void;
  className?: string;
}

const BackButton = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [canBack, setCanBack] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (history.state.key && !sessionId) {
        setSessionId(history.state.key);
      }

      // Check if we can go back after component mounts
      const canGoBack = history.state?.key !== sessionId;
      setCanBack(canGoBack);
    }
  }, [sessionId]);

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
        'lg:w-[30px] flex w-[20px] justify-start items-center text-xl shrink-0 absolute left-0',
        canBack && 'hover:scale-110'
      )}
    >
      {canBack ? (
        <button
          onClick={handleBackClick}
          className="flex items-center cursor-pointer select-none"
        >
          <Undo2
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

const Tabs = ({
  tabs = [],
  activeIndex,
  setActiveIndex,
  onTabClick,
  className,
}: TabsProps) => {
  const router = useRouter();
  const pathname = usePathname();

  const handleTabClick = (tab: TabItem, idx: number) => {
    if (onTabClick) {
      onTabClick(tab, idx);
    } else if (tab.href) {
      // If no onTabClick provided but tab has href, navigate to URL
      router.push(tab.href);
    } else {
      setActiveIndex(idx);
    }
  };

  return (
    <div
      className={cn(
        'py-2 md:py-2 flex items-center justify-center md:rounded overflow-auto w-full',
        className
      )}
    >
      <div className="flex md:rounded w-[fit-content] shrink-0 flex gap-2">
        {tabs.map((tab, idx) => {
          let isActive;

          // If tab has isActive function, use it to determine if the tab is active
          if (tab.isActive) {
            isActive = tab.isActive(pathname);
          } else {
            // Otherwise use whatever we had before... I think we can remove this later, but lets keep it so I don't break anything
            isActive = idx === activeIndex;
          }

          return (
            <button
              key={tab.label}
              type="button"
              data-tab-index={idx}
              className={cn(
                'shrink-0 cursor-pointer px-3 py-1.5 flex justify-center items-center whitespace-nowrap flex-shrink-0 border-b-2 border-b-solid border-b-transparent',
                'hover:!bg-[rgba(234,244,251,1)]',
                isActive
                  ? 'rounded-[1px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] !bg-[rgba(234,244,251,1)] !border-b-2 !border-b-solid !border-[rgba(22,90,141,1))]'
                  : 'rounded-xs',
                tab.labelIcon && 'pl-2'
              )}
              onClick={() => handleTabClick(tab, idx)}
            >
              <div
                className={cn(
                  'text-center justify-center text-sm font-medium leading-tight flex gap-2 font-medium items-center',
                  isActive ? '' : 'cursor-pointer'
                )}
              >
                {tab.labelIcon && <tab.labelIcon size={14} />}
                {tab.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default function PageLayout({
  title,
  children,
  tabs = [],
  activeIndex: externalActiveIndex,
  setActiveIndex: externalSetActiveIndex,
  onTabClick,
}: PageLayoutProps) {
  const pathname = usePathname();
  const [internalActiveIndex, setInternalActiveIndex] = useState(0);

  // Use external state if provided, otherwise use internal state
  const activeIndex =
    externalActiveIndex !== undefined
      ? externalActiveIndex
      : internalActiveIndex;
  const setActiveIndex = externalSetActiveIndex || setInternalActiveIndex;

  const activeTab = tabs[activeIndex];
  const isMobile = useIsMobile();

  const isScrolled = useIsScrolled(20);

  return (
    <>
      {/* Mobile layout */}
      {isMobile && (
        <>
          <div
            className="relative md:hidden grow flex flex-col"
            data-type="layout-mobile"
          >
            {title && (
              <div
                data-page="Header"
                className={cn(
                  'w-full shrink-0 relative flex flex-col items-start transition-transform text-white translate-y-[0px] duration-300 px-4 gap-5 sticky top-0 z-[999998]',
                  isScrolled ? '!translate-y-[-10px] !text-black' : ''
                )}
                style={{
                  background: isScrolled
                    ? 'white'
                    : `radial-gradient(196.3% 65.93% at 98.09% -7.2%, rgba(246, 180, 14, 0.30) 0%, rgba(246, 180, 14, 0.00) 100%),
            radial-gradient(71.21% 71.21% at 50% 71.21%, rgba(36, 36, 54, 0.20) 0%, rgba(36, 36, 54, 0.00) 100%),
            linear-gradient(263deg, rgba(246, 180, 14, 0.30) 2.9%, rgba(45, 45, 66, 0.30) 58.72%, rgba(36, 36, 54, 0.30) 100.39%),
            linear-gradient(98deg, rgba(116, 172, 223, 0.80) -7.48%, rgba(73, 129, 180, 0.80) 43.5%, rgba(255, 133, 166, 0.80) 122.37%)`,
                  backgroundBlendMode: 'normal, normal, overlay, normal',
                  backdropFilter: isScrolled ? 'blur(0px)' : 'blur(4px)',
                  paddingTop: 'calc(0px + max(0px, env(safe-area-inset-top)))',
                }}
              >
                <div
                  className={cn(
                    'relative flex items-center  transition-transform duration-300 h-[59px] translate-y-[0px] justify-center w-full gap-3 font-medium'
                  )}
                >
                  <BackButton />
                  {title}
                </div>
              </div>
            )}

            {tabs.length > 1 && (
              <div
                className={cn(
                  'px-4 text-lg z-[1] font-bold border-b border-b-solid border-[#8855CC26] transition-transform translate-y-[0px] duration-300 sticky bg-white md:rounded-t-sm z-[999999]',
                  isScrolled ? '!translate-y-[-25px]' : ''
                )}
                style={{
                  top: 'calc(59px + max(0px, env(safe-area-inset-top)))',
                }}
              >
                <Tabs
                  tabs={tabs}
                  activeIndex={activeIndex}
                  setActiveIndex={setActiveIndex}
                  onTabClick={onTabClick}
                />
              </div>
            )}

            {/* Do not use padding left/right here, it will reduce flexibility for children that need to reach the edges of the screen */}
            <div className="w-full flex flex-col items-center justify-start grow relative">
              {activeTab && activeTab.component && (
                <activeTab.component activeIndex={activeIndex} />
              )}

              {children}
            </div>
          </div>

          <Menu />
        </>
      )}

      {/* Desktop layout */}
      {!isMobile && (
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
                        let isActive =
                          pathname === item.href ||
                          (item.href !== '/' && pathname.startsWith(item.href));

                        if (item.isActive) {
                          console.log('item.isActive', item.isActive(pathname));
                          isActive = item.isActive(pathname);
                        }

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              'p-1.5 px-2 text-sm flex gap-2 items-center rounded transition-colors duration-200',
                              isActive
                                ? 'font-semibold text-[#232336]'
                                : 'text-[#4B4B66] hover:text-[#232336]'
                            )}
                            style={{
                              backgroundColor: isActive
                                ? item.backgroundColor
                                : 'transparent',
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.backgroundColor =
                                  item.backgroundColor;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.backgroundColor =
                                  'transparent';
                              }
                            }}
                          >
                            <item.icon
                              // @ts-ignore
                              size={18}
                              active={isActive}
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
                        onTabClick={onTabClick}
                      />
                    </div>
                  )}
                  {/* Do not use padding left/right here, it will reduce flexibility for children that need to reach the edges of the screen */}
                  <div className="overflow-auto">
                    {activeTab && activeTab.component && (
                      <activeTab.component activeIndex={activeIndex} />
                    )}

                    {children}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
