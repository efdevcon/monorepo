'use client';
import React, { use, useState, useEffect } from 'react';
import { Separator } from 'lib/components/ui/separator';
import { useNow } from 'lib/hooks/useNow';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  useAdditionalTicketEmails,
  ensureUserData,
  useTickets,
  useSessions,
  useAllStages,
} from '@/app/store.hooks';
import { toast } from 'sonner';
import cn from 'classnames';
import { StageBadge } from '@/components/StageBadge';
import Image from 'next/image';
import imgMeerkat from './meerkat.png';
import moment, { Moment } from 'moment';
import Button from 'lib/components/voxel-button/button';
import {
  ClockIcon,
  ArrowLeft as ChevronLeftIcon,
  ShareIcon,
  LanguagesIcon,
  MapPinIcon,
} from 'lucide-react';

const streams = {
  amphitheater: {
    translations: 'https://stm.live/stage-Amphitheatre/fullscreen?embed=true',
    // youtube: 'https://www.youtube.com/embed/aLptf94VIxc?si=tEFsjIPrfjw5c_v-',
  },
  lightning: {
    translations: 'https://stm.live/Stage-lightning/fullscreen?embed=true',
    youtube: 'https://www.youtube.com/embed/Q3MogrrDdcA?si=6xmYNVo14n1h1GI3',
    // youtube: '',
    // https://www.youtube.com/watch?v=Q3MogrrDdcA
  },
  ceibo: {
    translations: 'https://stm.live/stage-CEIBO/fullscreen?embed=true',
    // youtube: 'https://www.youtube.com/embed/Mw5LZW2wICs?si=C4BiC_Q2V9EiVVm4',
  },
  nogal: {
    translations: 'https://stm.live/stage-NOGAL/fullscreen?embed=true',
    youtube: 'https://youtube.com/embed/4XpdA_In-fM?feature=share',
    // youtube: 'https://www.youtube.com/embed/C-kF0gplCto?si=NCDndzxiDbawrnFK',
  },
  xs: {
    translations: 'https://stm.live/Stage-XS/fullscreen?embed=true',
    // ef
    // youtube: 'https://www.youtube.com/embed/szklyKbIiuk?si=KvVcEKzBACsgkhDn',
    youtube: 'https://youtube.com/embed/3mU5r4LW_ik?feature=share',
  },
  xl: {
    translations: 'https://stm.live/XL-Devconnect-Stage/fullscreen?embed=true',
    youtube: 'https://youtube.com/embed/2z0I6ONlKlU?feature=share',
    // youtube: 'https://www.youtube.com/embed/duyTQ281fv8?si=wTsQq0_RnOC7GIvu',
    // youtube: 'https://www.youtube.com/embed/mHogyTNraE0?si=1Y01REE6N5ZUS4XI',
    // x: 'https://x.com/i/broadcasts/1eaKbjmYrlVKX',
  },
  m1: {
    translations: 'https://stm.live/Stage-M1/fullscreen?embed=true',
    // ef
    youtube: 'https://www.youtube.com/embed/j-suy3GGyow?si=cPCcfOCv7nQ-S85Z',
    // creciemiento
    // youtube: 'https://www.youtube.com/embed/TXvMTXlS_uc?si=TXvMTXlS_uc',
  },
  m2: {
    translations: 'https://stm.live/Stage-M2/fullscreen?embed=true',
    youtube: 'https://www.youtube.com/embed/XL_Nn4oep6M?si=T-8vbpZYb_J6uG5Q',
  },
  l: {
    translations: 'https://stm.live/Stage-L/fullscreen?embed=true',
    // ef
    // youtube: 'https://www.youtube.com/embed/LaUkhyb5Gw0?si=RaPUyXDGE1a82FXF',
    // dss
    // youtube: 'https://www.youtube.com/embed/fGmtSSpoXm8?si=I_rDk3sQpkoGbZvL',
    youtube: 'https://youtube.com/embed/t-GKO64eQyI?feature=share',
  },
  bootcamp: {
    translations: 'https://stm.live/Stage-Bootcamp/fullscreen?embed=true',
    // youtube: 'https://www.youtube.com/embed/CjCii7U2GiY?si=zLDUGOn-Ygly3Z_5',
  },
};

const AITranslations = ({
  stage,
  isEnabled,
}: {
  stage: string;
  isEnabled: boolean;
}) => {
  const translationUrl = (streams as any)[stage]?.translations;

  if (!translationUrl || !isEnabled) {
    return null;
  }

  return (
    <div className="max-w-[500px] self-center rounded-xl w-full h-full bg-white border border-solid border-neutral-200 aspect-[436/776]">
      <iframe
        src={`${translationUrl}`}
        title={stage}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full rounded-xl"
      />
    </div>
  );
};

const MeerkatComponent = ({ stage }: { stage: string }) => {
  const { tickets } = useTickets();
  const url = `https://app.meerkat.events/stage/${stage}/qa`;

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
    window.open(url, '_blank');
  };

  return (
    <Link href={url} onClick={handleClick} className={cn('w-full self-start')}>
      <Button size="sm" color="blue-2" className="w-full">
        <div className="flex flex-col items-start">
          <div className="text-sm font-semibold leading-tight">
            Ask a Question
          </div>
        </div>
        <Image src={imgMeerkat} alt="Meerkat" width={23} />
        {/* <div className="text-[11px]">Powered by Meerkat</div> */}
      </Button>
    </Link>
  );
};

// const devconnectMoment = moment.utc('2025-11-18 11:30:00').subtract(3, 'hours');

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
  const [translationsVisible, setTranslationsVisible] = useState(false);
  const { stage } = use(params);
  const searchParams = useSearchParams();
  const dayParam = searchParams.get('day');
  const now = useNow();
  const today = now.format('YYYY-MM-DD');

  // Get stage metadata from useAllStages to find the apiSourceId
  const { pavilions } = useAllStages();
  const stageInfo = React.useMemo(() => {
    const allStages = [
      ...pavilions.yellowPavilion,
      ...pavilions.greenPavilion,
      ...pavilions.redPavilion,
      ...pavilions.amphitheater,
      ...pavilions.entertainment,
    ];
    return allStages.find((s) => s.id === stage);
  }, [pavilions, stage]);

  // Fetch sessions using the apiSourceId
  const { sessions, isLoading } = useSessions(stageInfo?.apiSourceId || '');

  // If stage doesn't exist, return null
  if (!stageInfo) {
    return null;
  }

  // Check if Open Air Cinema is closed on day 20
  const currentDay = now.date();
  const isOpenAirCinemaClosed =
    stageInfo.id === 'outdoor-cinema' && currentDay === 20;
  const isDSSNogalOn21th = stageInfo.id === 'nogal' && currentDay === 21;

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

  // Auto-select day: query param, current day if it has sessions, otherwise first day with sessions
  useEffect(() => {
    if (!selectedDay && sessions && sessions.length > 0) {
      const datesWithSessions = Object.keys(sessionsByDate).sort();

      // Check if day query param exists and construct the date
      if (dayParam) {
        const targetDate = moment
          .utc(`2025-11-${dayParam}`)
          .format('YYYY-MM-DD');
        if (
          sessionsByDate[targetDate] &&
          sessionsByDate[targetDate].length > 0
        ) {
          setSelectedDay(targetDate);
          return;
        }
      }

      // Check if today has sessions
      if (sessionsByDate[today] && sessionsByDate[today].length > 0) {
        setSelectedDay(today);
      } else if (datesWithSessions.length > 0) {
        // Select first day with sessions
        setSelectedDay(datesWithSessions[0]);
      }
    }
  }, [sessions, today, selectedDay, sessionsByDate, dayParam]);

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
          <div className="flex items-center gap-2">
            <Link href="/stages" className="flex items-center gap-1.5">
              <ChevronLeftIcon className="w-4 h-4" />
            </Link>
            <StageBadge
              type={stageInfo.pavilionType as any}
              label={stageInfo.name}
            />
          </div>
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
              Find Location
            </div>
          </Link>
        </div>

        <Separator className="my-2 grow w-auto" />

        {isOpenAirCinemaClosed && (
          <div className="mt-2 p-4 bg-yellow-50 mb-4 border border-yellow-200 rounded text-sm">
            Open Air Cinema is closed today due to rain.
          </div>
        )}

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
                {currentSession
                  ? currentSession.event.replace('(internal) Website - ', '')
                  : nextSession.event.replace('(internal) Website - ', '')}
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
      {((streams as any)[stageInfo.id]?.x ||
        (streams as any)[stageInfo.id]?.youtube) && (
        <div className="flex flex-col mx-6 gap-4">
          {(streams as any)[stageInfo.id]?.x ? (
            <Link
              href={(streams as any)[stageInfo.id].x}
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-[16/9] bg-blue-500 grow shrink-0 border border-solid border-neutral-200 flex items-center justify-center transition-colors"
            >
              <div className="text-white text-center">
                <div className="text-2xl font-bold mb-2">Watch Live on X</div>
                <div className="text-sm opacity-90">
                  Click here to open stream
                </div>
              </div>
            </Link>
          ) : (
            <div className="aspect-[16/9] bg-neutral-300 grow shrink-0 border border-solid border-neutral-200">
              <iframe
                className="w-full h-full"
                src={(streams as any)[stageInfo.id]?.youtube}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            </div>
          )}
          <div className="flex flex-col gap-2 shrink-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <MeerkatComponent stage={stageInfo.id} />
              {(streams as any)[stageInfo.id]?.translations && (
                <Button
                  onClick={() => setTranslationsVisible(!translationsVisible)}
                  color="blue-2"
                  size="sm"
                >
                  <div className="flex flex-col items-start">
                    <div className="font-semibold leading-tight flex items-center gap-1.5">
                      {translationsVisible
                        ? 'Hide Translations'
                        : 'Live Translations'}{' '}
                      <LanguagesIcon className="w-4 h-4" />
                    </div>
                  </div>
                </Button>
              )}
            </div>
            <AITranslations
              stage={stageInfo.id}
              isEnabled={translationsVisible}
            />
          </div>
        </div>
      )}
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
              <table className="w-full relative border border-solid border-neutral-200 text-xs md:text-sm leading-tight">
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
                        <div className="">
                          {session.event.replace('(internal) Website - ', '')}
                        </div>
                      </td>
                      <td className="p-4  py-3 border-b border-gray-200">
                        {session.speakers && session.speakers.length > 0
                          ? session.speakers
                              .filter(
                                (s: string) =>
                                  s !== 'TBD' &&
                                  !s.includes('docs.google.com') &&
                                  s.toLowerCase().trim() !== 'plug in'
                              )
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
