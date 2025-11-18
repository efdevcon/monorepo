'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { triggerHaptic } from 'tactus';
// import WorldsFairLogo from '@/images/worlds-fair-logo.png';
import EthereumWorldsFairLogo from '@/images/ethereum-worlds-fair-logo.png';
import NeedHelpIcon from '@/images/need-help.png';
import { NAV_ITEMS } from '@/config/nav-items';
import Link from 'next/link';
import cn from 'classnames';
import { useRouter } from 'next/navigation';
// import { sessionIdAtom } from '@/store/sessionId';
import { Blend as AppIcon, Undo2 } from 'lucide-react';
import Icon from '@mdi/react';
import {
  mdiInformation,
  mdiClose,
  mdiHelpCircle,
  mdiArrowRight,
} from '@mdi/js';
import Menu from '@/components/MobileMenu';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useTranslations } from 'next-intl';
import { useLocalStorage } from 'usehooks-ts';
import { useAnnouncements } from '@/app/store.hooks';
import { openReportIssue } from '@/utils/reportIssue';
import {
  HEIGHT_HEADER,
  HEIGHT_HEADER_TABS,
  HEIGHT_HEADER_PWA_DIFF,
  HEIGHT_MENU,
} from '@/config/config';
import { validLocales } from '@/i18n/locales';
import LanguageDetector from 'i18next-browser-languagedetector';

// Helper function to read cookie value
function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

// Helper function to detect browser language and set cookie if needed
function detectAndSetLanguage(): void {
  if (typeof window === 'undefined') return;

  // Check if language detection has already been performed
  const languageDetected = localStorage.getItem('language_detected');
  if (languageDetected) {
    return; // Already detected, skip
  }

  // Check if user already has a language preference set
  const existingLocale = getCookie('NEXT_LOCALE');
  if (existingLocale && validLocales.includes(existingLocale)) {
    // User already has a preference, mark as detected and skip
    localStorage.setItem('language_detected', 'true');
    return;
  }

  // Initialize language detector
  const languageDetector = new LanguageDetector();
  languageDetector.init({
    order: ['navigator', 'htmlTag'],
    lookupQuerystring: 'lng',
    lookupCookie: 'NEXT_LOCALE',
    lookupLocalStorage: 'i18nextLng',
    caches: [],
    excludeCacheFor: ['cimode'],
  });

  // Detect browser language
  const detectedLang = languageDetector.detect();
  const langCode = Array.isArray(detectedLang)
    ? detectedLang[0].split('-')[0]
    : (detectedLang || 'en').split('-')[0];

  // Check if detected language is in our valid locales
  if (validLocales.includes(langCode)) {
    // Set the cookie with detected language
    document.cookie = `NEXT_LOCALE=${langCode}; path=/; max-age=31536000`;

    // Mark detection as complete
    localStorage.setItem('language_detected', 'true');

    // Reload to apply the new language
    window.location.reload();
  } else {
    // Default to 'en' if browser language is not supported
    document.cookie = `NEXT_LOCALE=en; path=/; max-age=31536000`;
    localStorage.setItem('language_detected', 'true');
  }
}

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
  onQuestProgressClick?: () => void;
  showNeedHelp?: boolean;
  needHelpPosition?: 'left' | 'right';
}

interface TabsProps {
  tabs?: TabItem[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  onTabClick?: (tabItem: any, index: number) => void;
  className?: string;
}

const BackButton = React.memo(() => {
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
});

const Tabs = React.memo(
  ({
    tabs = [],
    activeIndex,
    setActiveIndex,
    onTabClick,
    className,
  }: TabsProps) => {
    const t = useTranslations('navigation');
    const router = useRouter();
    const pathname = usePathname();
    const announcements = useAnnouncements(true);

    const numberUnseenAnnouncements = announcements.filter(
      (announcement) => !announcement.seen
    ).length;

    const getTranslatedLabel = (label: string) => {
      const labelMap: Record<string, string> = {
        "Home": t('home'),
        "Schedule": t('schedule'),
        "Stages": t('stages'),
        "Tickets": t('tickets'),
        "Announcements": t('announcements'),
        "Wallet": t('wallet'),
        "Stampbook": t('stampbook'),
        "Settings": t('settings'),
      };
      return labelMap[label] || label;
    };

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
          'py-2 h-[47px] md:py-2 flex items-center justify-center md:justify-start md:rounded shrink-0 px-4 overflow-auto',
          '[mask-image:linear-gradient(to_right,transparent_0%,black_16px,black_calc(100%-32px),transparent_100%)]',
          tabs.length > 3 && 'justify-start',
          className
        )}
      >
        <div className="flex md:rounded shrink-0 gap-1.5 mr-3">
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
                    'text-center justify-center text-sm font-medium leading-tight flex gap-1.5 items-center',
                    isActive
                      ? 'text-[#165a8d]'
                      : 'text-[#4b4b66] cursor-pointer'
                  )}
                >
                  {tab.labelIcon && (
                    <tab.labelIcon color={isActive ? '#165a8d' : '#4b4b66'} />
                  )}
                  {getTranslatedLabel(tab.label)}{' '}
                  {numberUnseenAnnouncements > 0 &&
                    tab.href === '/announcements' &&
                    `(${numberUnseenAnnouncements})`}
                </div>
              </button>
            );

            if (hasHref) {
              return (
                <Link
                  href={tab.href || ''}
                  key={tab.label}
                  prefetch={true}
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
  }
);

const PageLayout = React.memo(function PageLayout({
  title,
  children,
  tabs = [],
  activeIndex: externalActiveIndex,
  setActiveIndex: externalSetActiveIndex,
  onTabClick,
  hasBackButton,
  infoModalContent,
  questProgress,
  onQuestProgressClick,
  showNeedHelp = true,
  needHelpPosition = 'right',
}: PageLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [internalActiveIndex, setInternalActiveIndex] = useState(0);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showNeedHelpModal, setShowNeedHelpModal] = useState(false);
  const t = useTranslations();
  const tLayout = useTranslations('pageLayout');

  // Language detection - runs once on mount
  useEffect(() => {
    detectAndSetLanguage();
  }, []);

  // Check if return query parameter is true, if so treat it like hasBackButton
  const shouldShowBackButton =
    hasBackButton || searchParams.get('return') === 'true';
  // Use external state if provided, otherwise use internal state
  const activeIndex =
    externalActiveIndex !== undefined
      ? externalActiveIndex
      : internalActiveIndex;
  const setActiveIndex = externalSetActiveIndex || setInternalActiveIndex;

  const activeTab = tabs[activeIndex];
  const isMobile = useIsMobile();
  const [pwa] = useLocalStorage<boolean | null>('pwa', null);

  // Detect iOS 26.1 with AppleWebKit
  const [isIOS26_1] = useLocalStorage<boolean | null>('ios26_1', null);

  /*
   * iOS PWA Viewport Fix
   * See: /devconnect-app/IOS_PWA_VIEWPORT_FIX.md
   *
   * No JavaScript needed! Window scrolling is prevented via CSS (html/body overflow: hidden).
   * Content div handles all scrolling, preventing iOS auto-scroll from affecting fixed elements.
   * Menu stays at absolute bottom (852px) at all times, keyboard overlays it when open.
   */

  const heightHeaderTabsCalc = tabs.length > 0 ? HEIGHT_HEADER_TABS : 0;
  const heightHeaderCalc = pwa
    ? HEIGHT_HEADER + heightHeaderTabsCalc + HEIGHT_HEADER_PWA_DIFF
    : HEIGHT_HEADER + heightHeaderTabsCalc;

  return (
    <>
      {/* Mobile layout */}
      {isMobile && (
        <>
          {/* Header - Outside scrollable layout */}
          {(title || tabs.length > 1) && (
            <div className="w-full shrink-0 flex flex-col fixed top-0 left-0 right-0 z-[100]">
              {title && (
                <div
                  data-page="Header"
                  className="w-full flex flex-col items-start gradient-header text-white"
                  style={{
                    backgroundBlendMode: 'normal, normal, overlay, normal',
                    backdropFilter: isIOS26_1 ? undefined : 'blur(4px)',
                    paddingTop: 'env(safe-area-inset-top, 0px)',
                    background: isIOS26_1
                      ? '#3a365e'
                      : 'linear-gradient(91deg, #74acdf -26.73%, #165a8d 50.61%, #ff85a6 126.73%)',
                  }}
                >
                  <div
                    className={`flex items-center justify-between w-full px-6 p-3 ${pwa ? 'pt-0' : 'pt-3'} relative`}
                  >
                    {/* Left side: Back button or Need Help (if position is left) */}
                    <div className="absolute left-6 w-[20px] h-[20px] shrink-0 flex items-center justify-center">
                      {shouldShowBackButton && <BackButton />}
                      {showNeedHelp &&
                        needHelpPosition === 'left' &&
                        !shouldShowBackButton && (
                          <button
                            onClick={() => setShowNeedHelpModal(true)}
                            className="w-[24px] h-[24px] shrink-0 flex items-center justify-center"
                            aria-label="Need help"
                          >
                            <Icon path={mdiHelpCircle} size={1} />
                          </button>
                        )}
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
                            setShowInfoModal(true);
                          }}
                          className="w-[18px] h-[18px] shrink-0 flex items-center justify-center"
                          aria-label="Quest information"
                        >
                          <Icon path={mdiInformation} size={0.75} />
                        </button>
                      )}
                    </div>

                    {/* Right side: Quest completion count or Need Help (if position is right) */}
                    <div className="absolute right-6 flex items-center gap-1">
                      {questProgress && (
                        <button
                          onClick={onQuestProgressClick}
                          className="text-base font-medium text-white tracking-[-0.1px] whitespace-nowrap cursor-pointer"
                          style={{ fontFamily: 'Roboto Mono, monospace' }}
                          aria-label="View quest progress"
                        >
                          {questProgress.completed}/{questProgress.total}
                        </button>
                      )}
                      {showNeedHelp &&
                        needHelpPosition === 'right' &&
                        !questProgress && (
                          <button
                            onClick={() => setShowNeedHelpModal(true)}
                            className="w-[24px] h-[24px] shrink-0 flex items-center justify-center"
                            aria-label="Need help"
                          >
                            <Icon path={mdiHelpCircle} size={1} />
                          </button>
                        )}
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
          )}

          {/*
           * Scrollable Content Area - iOS PWA Viewport Fix
           * See: /devconnect-app/IOS_PWA_VIEWPORT_FIX.md
           *
           * This div handles ALL scrolling (body/html have overflow: hidden).
           * Key properties:
           * - flex-1: Takes all remaining vertical space
           * - overflow-y: auto: Makes this div scrollable (not window)
           * - WebkitOverflowScrolling: touch: Enables smooth iOS momentum scrolling
           * - paddingTop/Bottom: Creates space for fixed header/menu
           *
           * When input is focused, iOS scrolls THIS div (not window), so fixed
           * elements (header/menu) stay in position. window.scrollY always = 0.
           */}
          <div
            className="relative md:hidden flex-1 overflow-y-auto overflow-x-hidden flex flex-col"
            data-type="layout-mobile"
            style={{
              paddingTop: title
                ? `calc(${heightHeaderCalc}px + env(safe-area-inset-top, 0px))`
                : `calc(${heightHeaderTabsCalc}px + env(safe-area-inset-top, 0px))`,
              paddingBottom: isIOS26_1
                ? `152px`
                : `calc(${HEIGHT_MENU}px + env(safe-area-inset-bottom, 0px))`, // Menu height + safe area
              WebkitOverflowScrolling: 'touch', // Smooth iOS momentum scrolling
            }}
          >
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
          className="hidden md:flex flex-col items-start justify-start py-8 gradient-background always-gradient fixed-background grow"
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
                    src={EthereumWorldsFairLogo}
                    alt="Ethereum World's Fair Logo"
                    className="w-[89%]"
                  />

                  <div className="flex flex-col gap-2 border border-solid border-[#8855CC26] self-start p-3 w-[160px] rounded-sm bg-white">
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
                            prefetch={true}
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
                <div className="h-[45px] my-2 ml-6 text-lg font-bold flex items-center justify-between pr-6">
                  <span>{title}</span>
                  {showNeedHelp && (
                    <button
                      onClick={() => setShowNeedHelpModal(true)}
                      className="w-[24px] h-[24px] shrink-0 flex items-center justify-center hover:opacity-70 transition-opacity"
                      aria-label="Need help"
                    >
                      <Icon
                        path={mdiHelpCircle}
                        size={1}
                        className="text-[#0073de]"
                      />
                    </button>
                  )}
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

      {/* Need Help Modal */}
      {showNeedHelpModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowNeedHelpModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white border border-[#c7c7d0] rounded w-[353px] max-w-[calc(100%-40px)] md:w-[560px] mx-5">
            <div className="pt-3 pb-5 px-4">
              {/* Close button */}
              <button
                onClick={() => setShowNeedHelpModal(false)}
                className="absolute right-3 top-3 cursor-pointer hover:opacity-70 transition-opacity z-10"
                aria-label="Close modal"
              >
                <Icon path={mdiClose} size={1} className="text-[#4b4b66]" />
              </button>

              {/* Icon */}
              <div className="mb-4">
                <Image
                  src={NeedHelpIcon}
                  alt="Need help"
                  className="w-12 h-12"
                />
              </div>

              {/* Content */}
              <div className="mb-4">
                <h3 className="text-[#20202b] text-lg font-bold mb-2">
                  {tLayout('needHelp')}
                </h3>
                <p className="text-[#353548] text-sm md:text-base leading-[1.3]">
                  {tLayout('needHelpDescription')}
                </p>
              </div>

              {/* Buttons */}
              <div className="flex flex-col md:flex-row gap-3">
                {/* Support FAQ - Primary button (first on mobile, second on desktop) */}
                <button
                  onClick={() => {
                    window.open('https://devconnect.org/faq', '_blank');
                    setShowNeedHelpModal(false);
                  }}
                  className="w-full md:order-2 bg-[#0073de] hover:bg-[#0060c0] px-6 py-3 rounded-[1px] shadow-[0px_4px_0px_0px_#005493] flex items-center justify-center gap-2 transition-colors"
                >
                  <span className="text-white text-base font-bold">
                    {tLayout('supportFAQ')}
                  </span>
                  <Icon
                    path={mdiArrowRight}
                    size={0.67}
                    className="text-white"
                  />
                </button>

                {/* Send Feedback - Secondary button (second on mobile, first on desktop) */}
                <button
                  onClick={() => {
                    openReportIssue();
                    setShowNeedHelpModal(false);
                  }}
                  className="w-full md:order-1 bg-[#eaf3fa] hover:bg-[#d8ebf7] px-6 py-3 rounded-[1px] shadow-[0px_4px_0px_0px_#595978] flex items-center justify-center gap-2 transition-colors"
                >
                  <span className="text-[#44445d] text-base font-bold">
                    {tLayout('sendFeedback')}
                  </span>
                  <Icon
                    path={mdiArrowRight}
                    size={0.67}
                    className="text-[#44445d]"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default PageLayout;
