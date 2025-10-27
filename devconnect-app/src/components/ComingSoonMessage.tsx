'use client';

import Image from 'next/image';
import Link from 'next/link';
import ChefsCookingImage from '@/images/chefs-cooking.png';

interface ComingSoonMessageProps {
  message?: string;
  className?: string;
}

export default function ComingSoonMessage({
  message = "We're still cooking!",
  className = '',
}: ComingSoonMessageProps) {
  return (
    <div
      className={`flex items-center justify-center px-4 w-full flex-1 ${className}`}
      style={{
        background:
          'linear-gradient(0deg, rgba(246, 182, 19, 0.15) 6.87%, rgba(255, 133, 166, 0.15) 14.79%, rgba(152, 148, 255, 0.15) 22.84%, rgba(116, 172, 223, 0.15) 43.68%, rgba(238, 247, 255, 0.15) 54.97%), #FFF',
      }}
    >
      <div className="bg-white border border-[#ededf0] rounded-[4px] max-w-[560px] min-w-[320px] w-full mx-auto">
        <div className="flex flex-col gap-4 items-center justify-center px-4 py-6">
          <div className="flex flex-col gap-8 items-start w-full">
            {/* Chef cooking image */}
            <div className="relative w-full aspect-[2912/1632]">
              <Image
                src={ChefsCookingImage}
                alt="Chefs cooking"
                fill
                className="object-cover object-center"
                priority
              />
            </div>

            {/* Content */}
            <div className="flex flex-col gap-4 items-center w-full">
              <h2 className="font-bold text-2xl text-[#20202b] text-center tracking-[-0.1px] leading-[1.2] w-full">
                {message}
              </h2>
              <div className="flex flex-col gap-3 items-start w-full">
                <p className="font-normal text-base text-[#20202b] text-center tracking-[-0.1px] leading-[1.3] w-full">
                  Whilst we apply the finishing touches, check out the{' '}
                  <Link
                    href="/schedule"
                    target="_blank"
                    className="font-bold text-[#0073de] underline"
                  >
                    Schedule
                  </Link>{' '}
                  and get your{' '}
                  <Link
                    href="/tickets"
                    target="_blank"
                    className="font-bold text-[#0073de] underline"
                  >
                    Tickets
                  </Link>{' '}
                  loaded into the app!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

