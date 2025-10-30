'use client';
import React from 'react';
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
        'border border-solid border-neutral-100 p-4 px-6 self-start',
        tickets.length > 0 ? 'block' : 'pointer-events-none opacity-50'
      )}
    >
      <div className="text-sm font-bold">Join live Q/A</div>
      <div className="text-[11px]">Powered by Meerkat</div>
    </Link>
  );
};

const StagesPage = () => {
  const isBetaMode = hasBetaAccess();
  if (isBetaMode) {
    return <ComingSoonMessage />;
  }
  return (
    <div className="flex flex-col w-full">
      <div className="mx-4 mt-4 aspect-[16/9] bg-neutral-100 p-4 w-full">
        <h1>Stage Stream</h1>
      </div>
      <div className="p-4 flex gap-2 w-full">
        <MeerkatComponent />
      </div>
      <Separator className="my-2 mx-4 grow w-auto" />
      <div className="p-4 w-full">
        <h1>Programming for this stage....</h1>
      </div>
    </div>
  );
};

export default StagesPage;
