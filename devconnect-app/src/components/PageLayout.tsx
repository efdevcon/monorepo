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
import { useTranslations } from 'next-intl';
import { useLocalStorage } from 'usehooks-ts';

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
        'flex justify-start items-center text-xl absolute left-0 top-1/2 -translate-y-1/2',
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
        'py-2 md:py-2 flex items-center justify-center md:justify-start md:rounded overflow-auto w-full',
        className
      )}
    >
      <div className="flex md:rounded w-[fit-content] shrink-0 gap-2">
        {tabs.map((tab, idx) => {
          let isActive;

          // If tab has isActive function, use it to determine if the tab is active
          if (tab.isActive) {
            isActive = tab.isActive(pathname);
          } else {
            // Otherwise use whatever we had before... I think we can remove this later, but lets keep it so I don't break anything
            isActive = idx === activeIndex;
          }

          const hasHref = tab.href && tab.href !== '';
          const tabBody = (
            <button
              key={tab.label}
              type="button"
              data-tab-index={idx}
              className={cn(
                'shrink-0 cursor-pointer px-3 py-1.5 flex justify-center items-center whitespace-nowrap border-b-2 border-b-solid border-b-transparent',
                'hover:!bg-[rgba(234,244,251,1)]',
                isActive
                  ? 'rounded-[1px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] !bg-[rgba(234,244,251,1)] !border-b-2 !border-b-solid !border-[rgba(22,90,141,1))]'
                  : 'rounded-xs',
                tab.labelIcon && 'pl-2'
              )}
              onClick={hasHref ? undefined : () => handleTabClick(tab, idx)}
            >
              <div
                className={cn(
                  'text-center justify-center text-sm font-medium leading-tight flex gap-2 items-center',
                  isActive ? 'text-[#165a8d]' : 'text-[#4b4b66] cursor-pointer'
                )}
              >
                {tab.labelIcon && (
                  <tab.labelIcon color={isActive ? '#165a8d' : '#4b4b66'} />
                )}
                {tab.label}
              </div>
            </button>
          );

          if (hasHref) {
            return (
              <Link href={tab.href || ''} key={tab.label}>
                {tabBody}
              </Link>
            );
          } else {
            return tabBody;
          }
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
  const t = useTranslations();
  // Use external state if provided, otherwise use internal state
  const activeIndex =
    externalActiveIndex !== undefined
      ? externalActiveIndex
      : internalActiveIndex;
  const setActiveIndex = externalSetActiveIndex || setInternalActiveIndex;

  const activeTab = tabs[activeIndex];
  const isMobile = useIsMobile();
  const [pwa] = useLocalStorage<boolean | null>('pwa', null);

  return (
    <>
      {/* Mobile layout */}
      {isMobile && (
        <>
          <div
            className="relative md:hidden grow flex flex-col"
            data-type="layout-mobile"
          >
            <div className="w-full shrink-0 flex flex-col sticky top-0 z-[999999]">
              {title && (
                <div
                  data-page="Header"
                  className="w-full flex flex-col items-start gradient-header text-white"
                  style={{
                    backgroundBlendMode: 'normal, normal, overlay, normal',
                    backdropFilter: 'blur(4px)',
                    paddingTop:
                      'calc(0px + max(0px, env(safe-area-inset-top)))',
                  }}
                >
                  <div
                    className="flex items-center justify-between w-full px-6 pb-3"
                    style={{ paddingTop: pwa ? '0' : '0.75rem' }}
                  >
                    {/* <div className="relative w-[20px] lg:w-[30px] shrink-0">
                      <BackButton />
                    </div> */}
                    <h1
                      className="flex-1 text-lg font-bold text-center tracking-[-0.1px]"
                      style={{ textShadow: 'rgba(0,0,0,0.15) 0px 1px 3px' }}
                    >
                      {title}
                    </h1>
                    <div className="w-[20px] lg:w-[30px] shrink-0" />
                  </div>
                </div>
              )}

              {tabs.length > 1 && (
                <div className="px-4 text-lg font-bold border-b border-b-solid border-[#8855CC26] bg-white md:rounded-t-sm">
                  <Tabs
                    tabs={tabs}
                    activeIndex={activeIndex}
                    setActiveIndex={setActiveIndex}
                    onTabClick={onTabClick}
                  />
                </div>
              )}
            </div>

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
                            {t(item.label)}
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
                <div className="flex-1 border border-solid border-[#8855CC26] h-[fit-content] rounded-sm relative">
                  {tabs.length > 1 && (
                    <div className="px-4 py-2 text-lg font-bold border-b border-b-solid border-[#8855CC26] w-full sticky rounded-t-sm top-0 bg-white z-[100]">
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
