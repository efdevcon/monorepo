'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import TicketBackground from 'assets/images/dc-7/ticket-bg.png'
import LogoFlowers from 'assets/images/dc-7/logo-flowers.png'
import css from './tickets.module.scss'
import WhenImage from 'assets/images/dc-7/date-text.png'
import { cn } from 'lib/shadcn/lib/utils'
import { useZupass } from 'context/zupass'
import QRCode from 'react-qr-code'

interface Props {
  className?: string
}

export function ZupassTickets(props: Props) {
  const zupass = useZupass()
  const [ticket, setTicket] = useState<any>()
  const [swag, setSwag] = useState<any>()
  const [collectibles, setCollectibles] = useState<any>()

  let className = ''
  if (props.className) {
    className = cn(props.className)
  }

  useEffect(() => {
    async function init() {
      const ticket = await zupass.GetTicket()
      const swag = await zupass.GetSwag()
      const collectibles = await zupass.GetCollectibles()

      setTicket(ticket)
      setSwag(swag)
      setCollectibles(collectibles)
    }
    init()
  }, [])

  async function GetData() {
    const ticket = await zupass.GetTicket()
    const swag = await zupass.GetSwag()
    const collectibles = await zupass.GetCollectibles()

    setTicket(ticket)
    setSwag(swag)
    setCollectibles(collectibles)
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-2 basis-full shrink-0 md:basis-1/2">
        <div className="flex justify-between font-semibold  pb-2">
          <div>Ticket</div>
        </div>
        <div
          className="flex flex-col justify-between items-stretch relative rounded-xl aspect-[361/385] max-w-[450px] text-black overflow-hidden rounded-2xl"
          data-type="ticket"
        >
          <div className={cn('rounded-2xl', css['mask'])}></div>
          <div className={cn('rounded-2xl', css['border'])}></div>
          <div className="absolute inset-0 h-[55%] overflow-hidden rounded-2xl">
            <Image src={TicketBackground} alt="Devcon logo flowers" className="h-full object-contain object-right" />
          </div>

          <div className="flex flex-col h-[55%] justify-between p-4 relative max-w-[65%] pl-4">
            <div className="h-[23%]">
              <Image src={LogoFlowers} alt="Devcon logo flowers" className="h-full object-contain object-left" />
            </div>
            <div className="flex flex-col justify-center grow">
              <div className="text-lg lg:text-2xl break-words">{ticket?.attendeeName || 'Devcon Attendee'}</div>
              <span className="text-[#5B5F84]">{ticket?.ticketType || 'Ticket'}</span>
            </div>
            <div className="bold uppercase h-[20%] text-xs flex items-end">Devcon.org</div>
          </div>

          <div className="grow p-4 h-[45%] w-full border-dashed border-t border-[#D9D9D9] flex justify-between">
            <div className="p-4 border border-solid aspect-square border-[#D9D9D9] shrink-0 rounded-2xl">
              <div>
                {!ticket?.ticketSecret && <div className="text-center text-sm text-gray-500">No ticket secret</div>}
                {ticket?.ticketSecret && ticket?.isConsumed && (
                  <div className="text-center text-sm text-gray-500">Ticket already consumed</div>
                )}
                {ticket?.ticketSecret && !ticket?.isConsumed && (
                  <QRCode value={ticket?.ticketSecret} size={150} level="H" />
                )}
              </div>
            </div>
            <div className="flex flex-col justify-between p-1">
              <Image src={WhenImage} alt="When" className="w-[120px] self-end object-contain object-right mb-2" />
              <div className="ml-2 text-[9px] sm:text-xs text-right text-[#99A0AE]">
                <span className="font-semibold">QSNCC —</span>
                <br />
                60 Queen Sirikit National Convention Center Ratchadaphisek Road
                <br />
                Khlong Toei District
                <br />
                Bangkok, Thailand
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col basis-full shrink-0 md:basis-1/2 gap-2 h-full">
        <div className="flex font-semibold pb-2">
          <div>Swag Items</div>
        </div>
        Swag Items
      </div>
    </div>
  )
}
