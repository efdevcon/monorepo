'use client';
import React, { use, useState, useEffect } from 'react';
import { Separator } from 'lib/components/ui/separator';
import { fetchAuth } from '@/services/apiClient';
import { useNow } from 'lib/hooks/useNow';
import Link from 'next/link';
import {
  useAdditionalTicketEmails,
  ensureUserData,
  useTickets,
  useSessions,
  useAllStages,
} from '@/app/store.hooks';
import { toast } from 'sonner';
import cn from 'classnames';
import { hasBetaAccess } from '@/utils/cookies';
import ComingSoonMessage from '@/components/ComingSoonMessage';
import { StageBadge } from '@/components/StageBadge';
import Image from 'next/image';
import imgMeerkat from './meerkat.png';
import moment, { Moment } from 'moment';
import { ClockIcon, MapPinIcon } from 'lucide-react';

const MeerkatComponent = () => {
  const { tickets } = useTickets();

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    if (!tickets.length) {
      toast(
        'You need to be logged in with a valid ticket to participate in the Q/A'
      );
      return '';
    }

    // 1. generate single-sign on jwt to pass to meerkat
    // Hit backend here
    // const token = await fetchAuth('/api/auth/meerkat/single-sign-on');

    // 2. Pass off to Meerkat
    // window.location.href = `https://meerkat.events/e/stage-1?token=${token}`;
    window.open('https://meerkat.events/e/stage-1', '_blank');
  };

  return (
    <Link
      href="https://meerkat.events/e/stage-1"
      onClick={handleClick}
      className={cn(
        'border border-solid border-neutral-200 py-3 px-3 self-start bg-white flex items-center gap-2 justify-center',
        tickets.length > 0 ? 'block' : 'pointer-events-none opacity-50'
      )}
    >
      <Image src={imgMeerkat} alt="Meerkat" width={30} height={30} />
      <div className="flex flex-col items-start">
        <div className="text-xs font-semibold leading-tight">
          Join the live Q/A
        </div>
        <div className="text-[11px]">Powered by Meerkat</div>
      </div>
    </Link>
  );
};

// const devconnectMoment = moment.utc('2025-11-17 11:30:00').subtract(3, 'hours');

const StagesPage = ({ params }: { params: Promise<{ stage: string }> }) => {
  const [dates, setDates] = useState<Moment[]>([
    moment.utc('2025-11-17'),
    moment.utc('2025-11-18'),
    moment.utc('2025-11-19'),
    moment.utc('2025-11-20'),
    moment.utc('2025-11-21'),
    moment.utc('2025-11-22'),
  ]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const { stage } = use(params);
  const now = useNow();
  const today = now.format('YYYY-MM-DD');

  console.log(now.format('YYYY-MM-DD HH:mm:ss'), 'now ay ay');

  // Get stage metadata from useAllStages to find the apiSourceId
  const { pavilions } = useAllStages();
  const stageInfo = React.useMemo(() => {
    const allStages = [
      ...pavilions.yellowPavilion,
      ...pavilions.greenPavilion,
      ...pavilions.redPavilion,
      ...pavilions.music,
      ...pavilions.entertainment,
    ];
    return allStages.find((s) => s.id === stage);
  }, [pavilions, stage]);

  // Fetch sessions using the apiSourceId
  const { sessions, isLoading } = useSessions(stageInfo?.apiSourceId || '');

  const isBetaMode = hasBetaAccess();
  if (isBetaMode) {
    return <ComingSoonMessage />;
  }

  // If stage doesn't exist, return null
  if (!stageInfo) {
    return null;
  }

  // Group sessions by date - memoized to prevent infinite loop
  const sessionsByDate = React.useMemo(() => {
    const grouped: Record<string, any[]> = {};
    sessions?.forEach((session: any) => {
      // Parse the day field (format: DD/MM/YYYY)
      const sessionDate = moment(session.day, 'DD/MM/YYYY').format(
        'YYYY-MM-DD'
      );
      if (!grouped[sessionDate]) {
        grouped[sessionDate] = [];
      }
      grouped[sessionDate].push(session);
    });

    // Sort sessions by start time for each date
    Object.keys(grouped).forEach((date) => {
      grouped[date].sort((a, b) => {
        // Parse time in HH:MM format
        const timeA = moment(a.start, 'HH:mm');
        const timeB = moment(b.start, 'HH:mm');
        return timeA.diff(timeB);
      });
    });

    return grouped;
  }, [sessions]);

  // Auto-select day: current day if it has sessions, otherwise first day with sessions
  useEffect(() => {
    if (!selectedDay && sessions && sessions.length > 0) {
      const datesWithSessions = Object.keys(sessionsByDate).sort();

      // Check if today has sessions
      if (sessionsByDate[today] && sessionsByDate[today].length > 0) {
        setSelectedDay(today);
      } else if (datesWithSessions.length > 0) {
        // Select first day with sessions
        setSelectedDay(datesWithSessions[0]);
      }
    }
  }, [sessions, today, selectedDay, sessionsByDate]);

  const selectedDaySessions = selectedDay
    ? sessionsByDate[selectedDay] || []
    : [];

  // Find current and next session
  const todaysSessions = sessionsByDate[today] || [];
  const currentTime = now.format('HH:mm');

  const currentSession = React.useMemo(() => {
    return todaysSessions.find((session: any) => {
      return session.start <= currentTime && session.end > currentTime;
    });
  }, [todaysSessions, currentTime]);

  const nextSession = React.useMemo(() => {
    // First try to find next session today
    const nextToday = todaysSessions.find((session: any) => {
      return session.start > currentTime;
    });

    if (nextToday) return nextToday;

    // If no session today, find the next session across all dates
    const allSessions = Object.keys(sessionsByDate)
      .sort()
      .flatMap((dateKey) =>
        sessionsByDate[dateKey].map((session: any) => ({
          ...session,
          dateKey,
        }))
      );

    // Find first session after current time
    const nowDateTime = moment(`${today} ${currentTime}`, 'YYYY-MM-DD HH:mm');
    return allSessions.find((session: any) => {
      const sessionDateTime = moment(
        `${session.dateKey} ${session.start}`,
        'YYYY-MM-DD HH:mm'
      );
      return sessionDateTime.isAfter(nowDateTime);
    });
  }, [todaysSessions, currentTime, sessionsByDate, today]);

  // Calculate countdown to next session
  const countdown = React.useMemo(() => {
    if (!nextSession) return null;

    const nextSessionDateTime = moment.utc(
      `${nextSession.dateKey || today} ${nextSession.start}`,
      'YYYY-MM-DD HH:mm'
    );
    const duration = moment.duration(nextSessionDateTime.diff(now));

    if (duration.asSeconds() <= 0) return null;

    const days = Math.floor(duration.asDays());
    const hours = duration.hours();
    const minutes = duration.minutes();

    if (days > 0) {
      return `Starting in ${days}d ${hours}h`;
    } else if (hours > 0) {
      return `Starting in ${hours}h ${minutes}m`;
    } else {
      return `Starting in ${minutes}m`;
    }
  }, [nextSession, now, today]);

  return (
    <div className="flex flex-col w-full  bg-[#f6fafe]">
      <div className="py-5 pb-4 px-6 flex flex-col">
        <div className="flex justify-between items-center gap-2 mb-2">
          <StageBadge
            type={stageInfo.pavilionType as any}
            label={stageInfo.name}
          />
          <Link
            href={stageInfo.mapUrl}
            className="flex items-center gap-1 text-sm font-medium hover:underline text-[#0073de]"
          >
            {/* <img
              src="/images/poap-location.svg"
              alt="Quest Location"
              width={16}
              height={16}
              className="w-8 h-8 hover:opacity-80 transition-opacity"
            /> */}
            <MapPinIcon className="w-4 h-4" />
            <div
              className="text-xs font-bold leading-none tracking-[0.1px] hover:text-blue-800 transition-colors"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              Find Stage
            </div>
          </Link>
        </div>

        <Separator className="my-2 grow w-auto" />

        {currentSession || nextSession ? (
          <div className="flex flex-col lg:flex-row justify-between mt-1">
            <div className="flex flex-col">
              <div className="text-xl leading-tight">
                <span className="text-gray-600">
                  {currentSession ? 'Happening Now: ' : 'Next Up: '}
                </span>
                <span className="font-bold">
                  {currentSession
                    ? currentSession.title || currentSession.event
                    : nextSession.title || nextSession.event}
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {currentSession ? currentSession.event : nextSession.event}
              </div>
            </div>
            {!currentSession && (
              <div className="text-sm bg-white p-1 px-2 mt-2 border border-solid border-neutral-200 self-start lg:!self-end">
                <div className="flex items-center gap-1.5">
                  {countdown && (
                    <>
                      <ClockIcon className="w-4 h-4" />{' '}
                      <span className="font-semibold">{countdown}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : sessions && sessions.length > 0 ? (
          <div className="flex flex-col mt-1">
            <div className="text-lg text-gray-500 italic">
              No upcoming sessions
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col mx-6 gap-4">
        <div className="aspect-[16/9] bg-neutral-300 grow shrink-0 border border-solid border-neutral-200">
          {/* <iframe
            className="w-full h-full"
            src="https://www.youtube.com/embed/vabXXkZjKiw?si=-M34EYT3UoZoMyXQ"
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          ></iframe> */}
        </div>
        <div className="flex gap-2 shrink-0">
          <MeerkatComponent />
        </div>
      </div>
      <div className="p-4 px-6 w-full">
        <h2 className="text-xl font-bold mb-2 sm:mb-4">
          Programming
          {/* {selectedDay && '-'}{' '}
          {selectedDay ? moment(selectedDay).format('dddd, MMMM D, YYYY') : ''} */}
        </h2>
        <div className="flex justify-between items-center mb-2 sm:mb-4 gap-0.5 sm:gap-2">
          {dates.map((date, index) => {
            const dateStr = date.format('YYYY-MM-DD');
            const isToday = dateStr === today;
            const hasSessions =
              sessionsByDate[dateStr] && sessionsByDate[dateStr].length > 0;

            // Don't render dates with no sessions
            if (!hasSessions) return null;

            return (
              <div
                key={index}
                onClick={() => setSelectedDay(dateStr)}
                className={cn(
                  'px-1.5 sm:px-3 py-1.5 cursor-pointer text-xs sm:text-sm leading-tight transition-colors grow border border-solid border-neutral-200',
                  selectedDay === dateStr
                    ? 'bg-[#eaf4fb] !border-b-[#175a8d] !border-b-2'
                    : 'bg-white hover:bg-gray-100'
                )}
              >
                <div className="font-bold">
                  {isToday ? 'Today' : date.format('ddd')}
                </div>
                <div className="text-[11px] sm:text-inherit">
                  {date.format('MMM D')}
                </div>
              </div>
            );
          })}
        </div>

        {selectedDay && (
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="text-center py-8">Loading sessions...</div>
            ) : selectedDaySessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No sessions scheduled for this date
              </div>
            ) : (
              <table className="w-full relative border border-solid border-neutral-200 text-xs leading-tight">
                <thead className="">
                  <tr className="bg-[rgba(53,53,72,1)] text-white">
                    <th className="text-left p-4  font-bold">Time</th>
                    <th className="text-left p-4 font-bold">Topic + Event</th>
                    <th className="text-left p-4 font-bold">Speaker(s)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDaySessions.map((session: any, index: number) => (
                    <tr
                      key={index}
                      className="bg-white even:bg-[rgba(234,244,251,1)]"
                    >
                      <td className="p-4  py-3 border-b border-gray-200 whitespace-wrap">
                        {session.start} {/* - {session.end} */}
                      </td>
                      <td className="p-4  py-3 border-b border-gray-200">
                        {session.title && (
                          <div className="mb-1 font-medium">
                            {session.title}
                          </div>
                        )}
                        <div className="">{session.event}</div>
                      </td>
                      <td className="p-4  py-3 border-b border-gray-200">
                        {session.speakers && session.speakers.length > 0
                          ? session.speakers
                              .filter((s: string) => s !== 'TBD')
                              .join(', ') || 'TBD'
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StagesPage;
