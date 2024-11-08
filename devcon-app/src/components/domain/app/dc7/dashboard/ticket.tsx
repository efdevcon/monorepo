import React from 'react'
import Image from 'next/image'
import TicketBackground from 'assets/images/dc-7/ticket-bg.png'
import LogoFlowers from 'assets/images/dc-7/logo-flowers.png'
import css from './tickets.module.scss'
import WhenImage from 'assets/images/dc-7/date-text.png'
import { cn } from 'lib/shadcn/lib/utils'

export const Ticket = ({ name, ticketType }: { name: string, ticketType: string }) => {
    return (
      <div
        className="flex flex-col justify-between items-stretch relative rounded-xl aspect-[361/385] max-w-[450px] text-black overflow-hidden rounded-2xl"
        data-type="ticket"
      >
        <div className={cn('rounded-2xl', css['mask'])}></div>
        <div className={cn('rounded-2xl', css['border'])}></div>
        {/* <div
          style={{
            WebkitMask: 'radial-gradient(circle at left, transparent 20px, black 21px)',
          }}
          className="absolute left-0 w-[52%] h-full bg-[#F8F9FE] "
        ></div>
        <div
          style={{
            WebkitMask: 'radial-gradient(circle at right, transparent 20px, black 21px)',
          }}
          className="absolute right-0 w-[52%] h-full bg-[#F8F9FE] "
        ></div> */}
  
        <div
          className="absolute inset-0 h-[55%] overflow-hidden rounded-2xl"
        >
          <Image src={TicketBackground} alt="Devcon logo flowers" className="h-full object-contain object-right" />
        </div>

        <div className="flex flex-col h-[55%] justify-between p-4 relative max-w-[65%] pl-4">
          <div className="h-[23%]">
            <Image src={LogoFlowers} alt="Devcon logo flowers" className="h-full object-contain object-left" />
          </div>
          <div className="flex flex-col justify-center grow">
            <div className="text-lg lg:text-2xl break-words">{name || 'Devcon Attendee'}</div>
            <span className="text-[#5B5F84]">
              {ticketType || 'Ticket'}
            </span>
          </div>
          <div className="bold uppercase h-[20%] text-xs flex items-end">Devcon.org</div>
        </div>


        <div className="grow p-4 h-[45%] w-full border-dashed border-t border-[#D9D9D9] flex justify-between">
            <div className="p-4 border border-solid aspect-square border-[#D9D9D9] shrink-0 rounded-2xl">
                <div>QR Code goes here</div>
            </div>
            <div className='flex flex-col justify-between p-1'>
                <Image src={WhenImage} alt="When" className="w-[120px] self-end object-contain object-right mb-2" />
                {/* <div className='text-xs text-right text-[#99A0AE]'>Bangkok 12-15 blabla</div> */}
                <div className='ml-2 text-[9px] sm:text-xs text-right text-[#99A0AE]'><span className='font-semibold'>QSNCC —</span><br />60 Queen Sirikit National Convention Center Ratchadaphisek Road<br />Khlong Toei District<br />Bangkok, Thailand</div>
            </div>
        </div>
        {/* <div className="flex flex-col relative w-[37%] shrink-0 h-full p-4 border-l-2 border-l-solid border-dashed border-[#D9D9D9]">
          <div className="flex flex-col justify-end items-end text-sm">
            <div className="leading-3 bold uppercase text-xs text-nowrap text-[#5B5F84]">Bangkok, Thailand</div>
            <div className="text-sm text-nowrap">
              <span className="text-[#6B54AB]">12 — 15</span> Nov, 2024
            </div>
          </div>
        </div>
   */}
        {/* <div
          style={{
            WebkitMask: 'radial-gradient(circle at right, transparent 20px, black 21px)',
          }}
          className="absolute h-full w-full"
        >
          <Image
            src={selectedHero}
            alt={`Devcon Hero`}
            className={`absolute h-[75%] lg:h-[80%] left-0 right-0 bottom-0 object-contain object-right-bottom w-full ${
              heroIndex === 0 && ''
            }`}
          />
        </div> */}
      </div>
    )
  }