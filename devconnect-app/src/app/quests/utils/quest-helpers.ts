import type { Quest, QuestAction } from '@/types';
import { supportersData } from '@/data/supporters';
import confetti from 'canvas-confetti';
import { HEIGHT_HEADER } from '@/config/config';

/**
 * Get the icon path for a quest based on its action type
 */
export const getQuestIcon = (action: QuestAction): string => {
  const iconMap: Record<QuestAction, string> = {
    'connect-wallet': '/images/icons/ticket.svg',
    'associate-ticket': '/images/icons/ticket.svg',
    'setup-profile': '/images/icons/map.svg',
    'visit-link': '/images/icons/cash-plus.svg',
    'mini-quiz': '/images/icons/cash-plus.svg',
    'verify-payment': '/images/icons/cash-plus.svg',
    'claim-poap': '/images/icons/poap.png',
    'verify-basename': '/images/icons/check-circle.svg',
    'favorite-schedule': '/images/icons/heart-outline.svg',
    'explore-map': '/images/icons/map.svg',
    'try-qr': '/images/icons/qrcode-scan.svg',
    'verify-ens': '/images/icons/ens.png',
    todo: '/images/icons/default-quest.svg',
    'verify-balance': '/images/icons/peanut.png',
    '': '/images/icons/default-quest.svg',
  };

  return iconMap[action] || '/images/icons/default-quest.svg';
};

/**
 * Get supporter details by ID
 */
export const getSupporterById = (supporterId: number | string) => {
  return supportersData[supporterId.toString()];
};

/**
 * Scroll element into view accounting for sticky header
 */
export const scrollToElement = (element: HTMLElement, section = false) => {
  // Find the scrollable container (in mobile it's the PageLayout content div, not window)
  const scrollContainer =
    typeof window !== 'undefined'
      ? document.querySelector('[data-type="layout-mobile"]') ||
        document.querySelector('[data-type="layout-desktop"]') ||
        window
      : window;

  // Calculate safe area inset by reading the container's computed padding
  // PageLayout applies: paddingTop: calc(HEIGHT_HEADER + env(safe-area-inset-top))
  let safeAreaInsetTop = 0;
  if (scrollContainer && !(scrollContainer instanceof Window)) {
    const computedPaddingTop = parseInt(
      getComputedStyle(scrollContainer as HTMLElement).paddingTop || '0'
    );
    // Subtract HEIGHT_HEADER to get just the safe area inset
    safeAreaInsetTop = Math.max(0, computedPaddingTop - HEIGHT_HEADER);
  }

  // Calculate scroll position
  const elementRect = element.getBoundingClientRect();
  const currentScroll =
    scrollContainer instanceof Window
      ? window.pageYOffset || document.documentElement.scrollTop
      : (scrollContainer as HTMLElement).scrollTop;

  // Account for sticky header height + extra visual spacing
  const stickyHeaderOffset = HEIGHT_HEADER;
  // Base offsets + safe area inset for PWA mode
  const baseOffset = section ? 4 : 11;
  const extraOffset = baseOffset + safeAreaInsetTop;
  const targetScroll =
    currentScroll + elementRect.top - stickyHeaderOffset - extraOffset;

  // Scroll the correct element
  if (scrollContainer instanceof Window) {
    window.scrollTo({
      top: targetScroll,
      behavior: 'smooth',
    });
  } else {
    (scrollContainer as HTMLElement).scrollTo({
      top: targetScroll,
      behavior: 'smooth',
    });
  }
};

/**
 * Trigger full page confetti animation
 */
export const triggerDistrictConfetti = (
  districtId: string | undefined,
  questId: string,
  onComplete?: () => void
) => {
  const duration = 3000; // 3 seconds
  const animationEnd = Date.now() + duration;
  const defaults = {
    startVelocity: 15,
    spread: 360,
    ticks: 120,
    zIndex: 0,
    gravity: 0.5,
    colors: ['#FFD700', '#FFA500', '#FF69B4', '#87CEEB', '#98FB98'],
  };

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      onComplete?.();
      return;
    }

    const particleCount = 100 * (timeLeft / duration);

    // Trigger confetti from multiple points for full page effect
    confetti({
      ...defaults,
      particleCount: particleCount / 3,
      origin: { x: Math.random() * 0.3, y: Math.random() * 0.5 },
    });
    confetti({
      ...defaults,
      particleCount: particleCount / 3,
      origin: { x: 0.4 + Math.random() * 0.2, y: Math.random() * 0.5 },
    });
    confetti({
      ...defaults,
      particleCount: particleCount / 3,
      origin: { x: 0.7 + Math.random() * 0.3, y: Math.random() * 0.5 },
    });
  }, 250);
};

/**
 * Calculate progress for a list of quests
 */
export const calculateProgress = (
  quests: Quest[],
  questStates: Record<string, { status: string }>
): { completed: number; total: number; percentage: number } => {
  const total = quests.length;
  const completed = quests.filter((quest) => {
    const state = questStates[quest.id.toString()];
    return state?.status === 'completed';
  }).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percentage };
};

