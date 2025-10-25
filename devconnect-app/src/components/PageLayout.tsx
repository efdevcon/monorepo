'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { triggerHaptic } from 'tactus';
import WorldsFairLogo from '@/images/worlds-fair-logo.png';
import { NAV_ITEMS } from '@/config/nav-items';
import Link from 'next/link';
import cn from 'classnames';
import { useRouter } from 'next/navigation';
// import { sessionIdAtom } from '@/store/sessionId';
import { ArrowBigLeft, Blend as AppIcon, Undo2 } from 'lucide-react';
import Icon from '@mdi/react';
import { mdiBug, mdiInformation, mdiClose } from '@mdi/js';
import Menu from '@/components/MobileMenu';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useTranslations } from 'next-intl';
import { useLocalStorage } from 'usehooks-ts';
import { openReportIssue } from '@/utils/reportIssue';

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
  hasBackButton?: boolean;
  infoModalContent?: React.ReactNode;
  questProgress?: {
    completed: number;
    total: number;
  };
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
    triggerHaptic(200);
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
    triggerHaptic(200);
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
      id="page-tabs"
      className={cn(
        'py-2 md:py-2 flex items-center justify-center md:justify-start md:rounded shrink-0 px-4 overflow-auto',
        '[mask-image:linear-gradient(to_right,transparent_0%,black_16px,black_calc(100%-16px),transparent_100%)]',
        tabs.length > 3 && 'justify-start',
        className
      )}
    >
      <div className="flex md:rounded shrink-0 gap-2 mr-3">
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
              <Link
                href={tab.href || ''}
                key={tab.label}
                onClick={() => triggerHaptic(200)}
              >
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
  hasBackButton,
  infoModalContent,
  questProgress,
}: PageLayoutProps) {
  const pathname = usePathname();
  const [internalActiveIndex, setInternalActiveIndex] = useState(0);
  const [showInfoModal, setShowInfoModal] = useState(false);
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
  const isComingSoon = process.env.NEXT_PUBLIC_COMING_SOON === 'true';

  return (
    <>
      {/* Mobile layout */}
      {isMobile && (
        <>
          <div
            className="relative md:hidden grow flex flex-col pt-[100px]"
            data-type="layout-mobile"
            style={{
              paddingTop: title ? (tabs.length > 1 ? pwa ? '146px' : '100px' : pwa ? '98px' : '52px') : '0px',
            }}
          >
            <div className="w-full shrink-0 flex flex-col fixed top-0 left-0 right-0 z-[100]">
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
                    className="flex items-center justify-between w-full px-6 pb-3 relative"
                    style={{ paddingTop: pwa ? '0' : '0.75rem' }}
                  >
                    {/* Left side: Bug report button (only if questProgress exists) OR Back button */}
                    <div className="absolute left-6 w-[20px] h-[20px] shrink-0 flex items-center justify-center">
                      {isComingSoon && questProgress && (
                        <button
                          onClick={() => {
                            triggerHaptic(200);
                            openReportIssue();
                          }}
                          className="w-[24px] h-[24px] shrink-0 flex items-center justify-center"
                          aria-label="Report issue"
                        >
                          <Icon path={mdiBug} size={1} />
                        </button>
                      )}
                      {hasBackButton && !isComingSoon && <BackButton />}
                    </div>

                    {/* Center: Title with Info button */}
                    <div className="flex-1 flex items-center justify-center gap-1">
                      <h1
                        className="text-lg font-semibold text-center tracking-[-0.1px]"
                        style={{ textShadow: 'rgba(0,0,0,0.15) 0px 1px 3px' }}
                      >
                        {title}
                      </h1>
                      {infoModalContent && (
                        <button
                          onClick={() => {
                            triggerHaptic(200);
                            setShowInfoModal(true);
                          }}
                          className="w-[18px] h-[18px] shrink-0 flex items-center justify-center"
                          aria-label="Quest information"
                        >
                          <Icon path={mdiInformation} size={0.75} />
                        </button>
                      )}
                    </div>

                    {/* Right side: Quest completion count OR Bug report button */}
                    <div className="absolute right-6 flex items-center gap-1">
                      {questProgress ? (
                        <p
                          className="text-base font-medium text-white tracking-[-0.1px] whitespace-nowrap"
                          style={{ fontFamily: 'Roboto Mono, monospace' }}
                        >
                          {questProgress.completed}/{questProgress.total}
                        </p>
                      ) : isComingSoon ? (
                        <button
                          onClick={() => {
                            triggerHaptic(200);
                            openReportIssue();
                          }}
                          className="w-[24px] h-[24px] shrink-0 flex items-center justify-center"
                          aria-label="Report issue"
                        >
                          <Icon path={mdiBug} size={1} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              {tabs.length > 1 && (
                <div className="text-lg font-bold border-b border-b-solid border-[#8855CC26] bg-white md:rounded-t-sm">
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
          className="hidden md:flex flex-col items-start justify-start py-8 bg-[#f6fafe] !min-h-screen"
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

                  <div className="flex flex-col gap-2 border border-solid border-[#EFEFF5] self-start p-3 w-[160px] rounded-sm bg-white">
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
                            onClick={() => triggerHaptic(200)}
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
                    <div className="py-1.5 text-lg font-bold border-b border-b-solid border-[#8855CC26] w-full sticky rounded-t-sm top-0 bg-white z-[100]">
                      <Tabs
                        tabs={tabs}
                        activeIndex={activeIndex}
                        setActiveIndex={setActiveIndex}
                        onTabClick={onTabClick}
                      />
                    </div>
                  )}
                  {/* Do not use padding left/right here, it will reduce flexibility for children that need to reach the edges of the screen */}
                  <div className="overflow-auto bg-white">
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

      {/* Info Modal */}
      {showInfoModal && infoModalContent && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowInfoModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white border border-[#c7c7d0] rounded max-w-[353px] w-[calc(100%-40px)] mx-5">
            {/* Close button */}
            <button
              onClick={() => setShowInfoModal(false)}
              className="absolute right-3 top-3 cursor-pointer hover:opacity-70 transition-opacity z-10"
              aria-label="Close modal"
            >
              <Icon path={mdiClose} size={1} className="text-[#4b4b66]" />
            </button>

            {/* Content */}
            <div className="pt-4 pb-0 px-0">{infoModalContent}</div>
          </div>
        </div>
      )}
    </>
  );
}
