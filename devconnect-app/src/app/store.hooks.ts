'use client';

import { useEffect, useRef, useState } from 'react';
import { useGlobalStore } from './store.provider';
import {
  useUserData as useUserDataSWR,
  useTickets as useTicketsSWR,
  useFavorites as useFavoritesSWR,
  useQuestCompletions as useQuestCompletionsSWR,
} from '@/hooks/useServerData';
import { AppState } from './store';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import moment from 'moment';

// This is based on the notion database layer names. E.g. programming has "M2" but the map expects "m2-stage", so we have to map them to the canonical id
export const canonicalStageIds = {
  M1: 'm1-stage',
  M2: 'm2-stage',
  L: 'l-stage',
  XL: 'xl-stage',
  XS: 'xs-stage',
  LIGHTNING: 'lighting-talks-stage', // typo in the id but ehh whatever we will map our way out of it
  MUSIC: 'music-stage',
  STAGE1: 'stage-1',
  CINEMA: 'open-air-cinema',
};

// Stage names via stage IDs
export const canonicalStageNames = {
  'm1-stage': 'M1 Stage',
  'm2-stage': 'M2 Stage',
  'l-stage': 'L Stage',
  'xl-stage': 'XL Stage',
  'xs-stage': 'XS Stage',
  'lighting-talks-stage': 'Lightning Stage',
  'music-stage': 'Music Stage',
  'stage-1': 'Stage 1',
  'open-air-cinema': 'Open Air Cinema',
};

const computeStages = (events?: any[]) => {
  if (!events) return [];
  if (!events || !Array.isArray(events)) return [];

  const uniqueStages = new Set<string>();
  events.forEach((event) => {
    if (event.stage) {
      const upperCaseStage = event.stage.toUpperCase();
      const canonicalStage =
        canonicalStageIds[upperCaseStage as keyof typeof canonicalStageIds];
      if (canonicalStage) {
        uniqueStages.add(canonicalStage);
      }
    }
  });

  return Array.from(uniqueStages).sort();
};

// Stage metadata - keys match normalized API values
const stageMetadata: Record<
  string,
  { name: string; mapUrl: string; pavilion: string }
> = {
  xl: {
    name: 'XL Stage',
    mapUrl: '/map?filter=xl-stage',
    pavilion: 'yellowPavilion',
  },
  x1: {
    name: 'XL Stage',
    mapUrl: '/map?filter=xl-stage',
    pavilion: 'yellowPavilion',
  },
  m2: {
    name: 'M2 Stage',
    mapUrl: '/map?filter=m2-stage',
    pavilion: 'yellowPavilion',
  },
  m1: {
    name: 'M1 Stage',
    mapUrl: '/map?filter=m1-stage',
    pavilion: 'yellowPavilion',
  },
  xs: {
    name: 'XS Stage',
    mapUrl: '/map?filter=xs-stage',
    pavilion: 'yellowPavilion',
  },
  // Map link not working
  bootcamp: {
    name: 'Bootcamp',
    mapUrl: '/map?filter=bootcamp',
    pavilion: 'yellowPavilion',
  },
  // Map link not working
  l: {
    name: 'L Stage',
    mapUrl: '/map?filter=l-stage',
    pavilion: 'redPavilion',
  },
  nogal: {
    name: 'Nogal Hall',
    mapUrl: '/map?filter=nogal-hall',
    pavilion: 'redPavilion',
  },
  ceibo: {
    name: 'Ceibo Hall',
    mapUrl: '/map?filter=ceibo-hall',
    pavilion: 'redPavilion',
  },
  amphitheater: {
    name: 'Music Stage',
    mapUrl: '/map?filter=music-stage',
    pavilion: 'music',
  },
};

// Normalize stage names from API to match our lookup keys
const normalizeStageId = (stageName: string): string => {
  return stageName.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
};

export const useAllStages = () => {
  const {
    data: events,
    error: eventsError,
    isLoading: eventsLoading,
  } = useSWR<any>(
    'https://devconnect.pblvrt.com/events',
    async (url: any) => {
      const res = await fetch(url);
      return res.json();
    },
    {
      dedupingInterval: 10000,
    }
  );
  // Handle both fallback format {success: true, data: [...]} and direct array format
  const eventData = events?.data || events;

  // Create map of normalized ID to canonical ID
  const stageMap = new Map<string, string>();
  eventData?.forEach((event: any) => {
    if (event.stage) {
      const normalizedId = normalizeStageId(event.stage);
      if (!stageMap.has(normalizedId)) {
        stageMap.set(normalizedId, event.stage);
      }
    }
  });

  const allStages = Array.from(stageMap.keys()).filter(
    (stage) => stage != null && stage !== ''
  );

  console.log('useAllStages - allStages:', allStages);

  // Group stages by pavilion with full metadata
  const pavilions = {
    yellowPavilion: [] as Array<{
      id: string;
      apiSourceId: string;
      name: string;
      mapUrl: string;
      pavilionType: string;
    }>,
    greenPavilion: [] as Array<{
      id: string;
      apiSourceId: string;
      name: string;
      mapUrl: string;
      pavilionType: string;
    }>,
    redPavilion: [] as Array<{
      id: string;
      apiSourceId: string;
      name: string;
      mapUrl: string;
      pavilionType: string;
    }>,
    music: [] as Array<{
      id: string;
      apiSourceId: string;
      name: string;
      mapUrl: string;
      pavilionType: string;
    }>,
    entertainment: [] as Array<{
      id: string;
      apiSourceId: string;
      name: string;
      mapUrl: string;
      pavilionType: string;
    }>,
  };

  // Map pavilion names to badge types
  const pavilionTypeMappings: Record<string, string> = {
    yellowPavilion: 'yellow',
    greenPavilion: 'green',
    redPavilion: 'red',
    music: 'music',
    entertainment: 'entertainment',
  };

  allStages?.forEach((stageId: string) => {
    const metadata = stageMetadata[stageId];
    const apiSourceId = stageMap.get(stageId);
    console.log(
      'Processing stage:',
      stageId,
      'apiSourceId:',
      apiSourceId,
      'metadata:',
      metadata
    );
    if (metadata && apiSourceId) {
      const pavilion = metadata.pavilion as keyof typeof pavilions;
      pavilions[pavilion].push({
        id: stageId,
        apiSourceId,
        name: metadata.name,
        mapUrl: metadata.mapUrl,
        pavilionType: pavilionTypeMappings[pavilion],
      });
    }
  });

  return {
    stages: allStages,
    pavilions,
    error: eventsError,
    isLoading: eventsLoading,
  };
};

export const useSessions = (stage: string) => {
  const {
    data: sessions,
    error: eventsError,
    isLoading: eventsLoading,
  } = useSWR<any>(
    `https://devconnect.pblvrt.com/sessions?stage=${stage}`,
    async (url: string) => {
      const res = await fetch(url);
      console.log(res, 'res ay ay');
      return res.json();
    },
    {
      dedupingInterval: 10000,
    }
  );

  return {
    sessions: sessions,
    error: eventsError,
    isLoading: eventsLoading,
  };
};

export const useProgramming = () => {
  const {
    data: events,
    error: eventsError,
    isLoading: eventsLoading,
  } = useSWR('https://devconnect.pblvrt.com/events', fetch);

  // const allStages = events?.data?.map((event: any) => event.stage);

  /* Example "schedule" entry from the /schedules endpoint
 {
    "event": "Daily Newcomers lessons",
    "title": "Presentación de la charla (moderador + oradores)",
    "description": "Keynote",
    "day": "21/11/2025",
    "start": "14:00",
    "end": "14:15",
    "speakers": [
      "Borja Martel",
      "Martin Carrica",
      "Sofia Vasquez"
    ]
  },
  */
  const {
    data: schedules,
    error: schedulesError,
    isLoading: schedulesLoading,
  } = useSWR('https://devconnect.pblvrt.com/schedules', fetch);

  const eventsData = (events as any)?.data;
  const schedulesData = (schedules as any)?.data;

  return {
    stages: computeStages(eventsData) as any,
    schedules: schedulesData as any,
    events: eventsData as any,
  } as any;

  const sessions: any = schedules;

  console.log(sessions, 'sessions ay');

  // Group sessions by day
  const sessionsByDay = sessions.reduce(
    (acc: Record<string, any[]>, session: any) => {
      // Check if session has a day field in DD/MM/YYYY format
      let day: string;
      if (session.day && /^\d{2}\/\d{2}\/\d{4}$/.test(session.day)) {
        // Parse DD/MM/YYYY format
        day = moment.utc(session.day, 'DD/MM/YYYY').format('YYYY-MM-DD');
      } else {
        // Assume start is in HH:mm format, use today as fallback
        day = moment.utc().format('YYYY-MM-DD');
      }

      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(session);
      return acc;
    },
    {} as Record<string, any[]>
  );

  // Convert to array and sort by day
  const daySchedules: any[] = Object.entries(sessionsByDay)
    .map(([day, sessions]: any) => ({
      day,
      sessions: sessions.sort((a: any, b: any) =>
        moment.utc(a.start, 'HH:mm').diff(moment.utc(b.start, 'HH:mm'))
      ),
    }))
    .sort((a: any, b: any) => a.day.localeCompare(b.day));

  return daySchedules;
};

/**
 * Manage favorite events (now using SWR)
 * Returns: [favorites, updateFavorite]
 */
export const useFavorites = () => {
  const { favorites, updateFavorite } = useFavoritesSWR();

  return [favorites, updateFavorite] as [string[], (eventId: string) => void];
};

/**
 * Get additional ticket emails (now using SWR)
 */
export const useAdditionalTicketEmails = () => {
  const { additionalTicketEmails } = useUserDataSWR();
  return additionalTicketEmails;
};

export const useEvents = () => {
  const events = useGlobalStore((state) => state.events);
  return events || [];
};

export const useAnnouncements = (updateOnPathnameChange = false) => {
  const pathname = usePathname();
  const announcements = useGlobalStore((state) => state.announcements);
  const [seenAnnouncements, setSeenAnnouncements] = useState<string[]>([]);

  const firstRun = useRef(true);

  useEffect(() => {
    // if (!updateOnPathnameChange) return;
    // Visiting /announcements marks all announcements as seen, but we only want them to be seen *after* they are seen (aka not immediately/on the first render)
    // ...so we only check for seen announcements on the very first render when visiting a page that uses useAnnouncements
    if (firstRun.current) {
      const seen = localStorage.getItem('seenAnnouncements');
      setSeenAnnouncements(seen ? JSON.parse(seen) : []);
      firstRun.current = false;
    }
  }, []);

  useEffect(() => {
    if (updateOnPathnameChange && pathname === '/announcements') {
      return () => {
        setSeenAnnouncements(
          announcements.map((announcement) => announcement.id)
        );
      };
    }
  }, [pathname]);

  return announcements.map((announcement) => ({
    ...announcement,
    seen: seenAnnouncements.includes(announcement.id),
  }));
};

/**
 * Manually fetch and update user data (for backward compatibility)
 * Note: Most code should use useUserData() hook instead
 */
export const ensureUserData = async (
  setUserData: (userData: AppState['userData']) => void
) => {
  // Direct fetch for backward compatibility
  const { fetchAuth } = await import('@/services/apiClient');
  const userData = await fetchAuth('/api/auth/user-data');

  if (userData.success && userData.data) {
    setUserData(userData.data);
  } else {
    console.error('Failed to fetch user data from supabase');
  }
};

/**
 * Hook to ensure user data is loaded (now uses SWR, no manual refetching needed)
 * SWR automatically handles revalidation on focus and reconnect
 *
 * ✨ NEW: Only fetches when email is available (indicating authentication readiness)
 * This prevents premature fetch attempts when Para is connecting but not ready to issue JWTs
 */
export const useEnsureUserData = (email: string | undefined) => {
  // SWR handles all the caching and revalidation automatically
  // Only fetch when email is available (indicates some form of authentication is ready)
  const { userData, refresh } = useUserDataSWR();

  // Optionally sync to Zustand for backward compatibility
  const setUserData = useGlobalStore((state) => state.setUserData);

  useEffect(() => {
    if (userData) {
      setUserData(userData);
    } else if (!email) {
      setUserData(null);
    }
  }, [userData, email, setUserData]);
};

/**
 * Hook to fetch and manage tickets (now using SWR)
 * SWR automatically handles caching, deduplication, and revalidation
 * Uses Zustand's persisted localStorage data as fallback for instant loading
 */
export const useTickets = () => {
  // Get persisted data from Zustand to use as fallback
  const persistedTickets = useGlobalStore((state) => state.tickets);
  const persistedQrCodes = useGlobalStore((state) => state.qrCodes);
  const persistedSideTickets = useGlobalStore((state) => state.sideTickets);

  // Initialize SWR with persisted data so tickets and QR codes appear instantly on page load
  const { tickets, sideTickets, qrCodes, loading, refresh } = useTicketsSWR(
    persistedTickets || undefined,
    persistedQrCodes,
    persistedSideTickets || undefined
  );

  // console.log('tickets amount', tickets.length);
  // console.log('tickets', tickets);
  // console.log('sideTickets amount', sideTickets.length);
  // console.log('sideTickets', sideTickets);

  // Sync fresh data back to Zustand for persistence
  const setTickets = useGlobalStore((state) => state.setTickets);
  const setSideTickets = useGlobalStore((state) => state.setSideTickets);
  const setQrCodes = useGlobalStore((state) => state.setQrCodes);
  const setTicketsLoading = useGlobalStore((state) => state.setTicketsLoading);

  useEffect(() => {
    // Only update Zustand if we have actual data (not just fallback)
    if (tickets) {
      setTickets(tickets);
      setQrCodes(qrCodes);
    }
    if (sideTickets) {
      setSideTickets(sideTickets);
    }
    setTicketsLoading(loading);
  }, [
    sideTickets,
    tickets,
    qrCodes,
    loading,
    setTickets,
    setQrCodes,
    setTicketsLoading,
  ]);

  return {
    tickets,
    sideTickets,
    loading,
    qrCodes,
    refresh,
  };
};

/**
 * Hook to sync quest completions to the database
 * Re-exports the useQuestCompletions hook from useServerData
 */
export const useQuestCompletions = () => {
  return useQuestCompletionsSWR();
};
