'use client';
import React, { use } from 'react';
import { Separator } from 'lib/components/ui/separator';
import { fetchAuth } from '@/services/apiClient';
import Link from 'next/link';
import {
  useAdditionalTicketEmails,
  ensureUserData,
  useTickets,
} from '@/app/store.hooks';
import { toast } from 'sonner';
import cn from 'classnames';
import { hasBetaAccess } from '@/utils/cookies';
import ComingSoonMessage from '@/components/ComingSoonMessage';
import { StageBadge } from '@/app/(page-layout)/stages/page';
import Image from 'next/image';
import imgMeerkat from './meerkat.png';

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
        'border border-solid border-neutral-200 p-3 px-6 self-start bg-white flex items-center gap-2',
        tickets.length > 0 ? 'block' : 'pointer-events-none opacity-50'
      )}
    >
      <div className="flex flex-col items-center">
        <div className="text-sm font-semibold leading-tight">
          Join the live Q/A
        </div>
        <div className="text-[11px]">Powered by Meerkat</div>
      </div>
      <Image src={imgMeerkat} alt="Meerkat" width={30} height={30} />
    </Link>
  );
};

const dummyProgramming = [
  {
    time: '09:00',
    topic: 'Opening Ceremony',
    speaker: 'Binji',
    isHighlighted: false,
  },
  {
    time: '09:30',
    topic: 'Devconnect Opening',
    speaker: 'Nathan Sexer',
    isHighlighted: false,
  },
  {
    time: '09:45',
    topic: 'EF & Ethereum Update',
    speaker: 'Tomasz Stańczak',
    isHighlighted: true,
  },
  {
    time: '10:05',
    topic: 'EF & Ethereum Update',
    speaker: 'Hsiao-Wei Wang',
    isHighlighted: false,
  },
  {
    time: '10:55',
    topic: 'The Trillion Dollar Security initiative',
    speaker: 'Mehdi Zerouali',
    isHighlighted: false,
  },
  {
    time: '11:25',
    topic: 'Ethereum is for Institutions and Enterprises',
    speaker: 'Danny Ryan',
    isHighlighted: false,
  },
  {
    time: '11:55',
    topic: 'Ethereum (Roadmap) in 30min',
    speaker: 'Vitalik Buterin',
    isHighlighted: false,
  },
];

const StagesPage = ({ params }: { params: Promise<{ stage: string }> }) => {
  const { stage } = use(params);
  const isBetaMode = hasBetaAccess();
  if (isBetaMode) {
    return <ComingSoonMessage />;
  }
  return (
    <div className="flex flex-col w-full  bg-[#f6fafe]">
      <div className="py-5 px-6 flex flex-col">
        <StageBadge type="yellow" label={stage} />
        <div className="text-2xl font-bold">
          Ethereum Day & Devconnect Opening Ceremony
        </div>
      </div>
      <div className="flex flex-col lg:flex-row flex-col mx-6 gap-4">
        <div className="aspect-[16/9] bg-neutral-100 grow">
          <iframe
            className="w-full h-full"
            src="https://www.youtube.com/embed/vabXXkZjKiw?si=-M34EYT3UoZoMyXQ"
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          ></iframe>
        </div>
        <div className="flex gap-2 shrink-0">
          <MeerkatComponent />
        </div>
      </div>
      <div className="p-4 px-6 w-full">
        <h2 className="text-xl font-bold mb-4">Programming</h2>
        <div className="overflow-x-auto">
          <table className="w-full border border-solid border-neutral-200 text-xs leading-tight">
            <thead>
              <tr className="bg-[rgba(53,53,72,1)] text-white">
                <th className="text-left p-4 font-bold">Time</th>
                <th className="text-left p-4 font-bold">Topic(s)</th>
                <th className="text-left p-4 font-bold">Speaker(s)</th>
              </tr>
            </thead>
            <tbody>
              {dummyProgramming.map((item, index) => (
                <tr
                  key={index}
                  className="bg-white even:bg-[rgba(234,244,251,1)]"
                >
                  <td
                    className={cn(
                      'p-4 py-3 border-b border-gray-200',
                      item.isHighlighted && 'font-bold'
                    )}
                  >
                    {item.time}
                  </td>
                  <td
                    className={cn(
                      'p-4 py-3 border-b border-gray-200',
                      item.isHighlighted && 'font-bold'
                    )}
                  >
                    {item.topic}
                  </td>
                  <td
                    className={cn(
                      'p-4 py-3 border-b border-gray-200',
                      item.isHighlighted && 'font-bold'
                    )}
                  >
                    {item.speaker}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StagesPage;
