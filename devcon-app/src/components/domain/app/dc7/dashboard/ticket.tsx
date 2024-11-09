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
import { StaticImageData } from 'next/image'
import QRIcon from 'assets/icons/dc-7/qr.svg'
import Herbal from 'assets/images/dc-7/swag/herbal.png'
import Pants from 'assets/images/dc-7/swag/pants.png'
import Lantern from 'assets/images/dc-7/swag/lantern.png'
import Raincoat from 'assets/images/dc-7/swag/raincoat.png'
import Shirt from 'assets/images/dc-7/swag/shirt.png'

interface Props {
  className?: string
}

interface SwagCardProps {
  title: any
  to: string
  description: string
  image: StaticImageData
  className?: string
}

const SwagCard = ({ title, to, description, image, className }: SwagCardProps) => {
  const [QRVisible, setQRVisible] = useState(false)
  const [isClaimed, setIsClaimed] = useState(false)

  return (
    <div
      onClick={() => {
        if (isClaimed) return

        setQRVisible(!QRVisible)
      }}
      className={cn(
        'rounded-2xl shrink-0 bg-white border border-solid border-[#E4E6EB] rounded-2xl overflow-hidden group relative cursor-pointer',
        className
      )}
    >
      {isClaimed && (
        <div className="absolute inset-0 bg-white/70 z-[1] flex items-center justify-center font-semibold text-sm">
          CLAIMED
        </div>
      )}

      {QRVisible && (
        <div className="absolute inset-0 bg-white/70 z-[1] flex items-center justify-center font-semibold text-sm">
          <div className="max-w-[130px] shrink-0" style={{ height: 'auto', margin: '0 auto', width: '100%' }}>
            <QRCode
              size={256}
              style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
              value={''}
              viewBox={`0 0 256 256`}
            />
          </div>
        </div>
      )}

      <div className={cn('', QRVisible && 'opacity-0 pointer-events-none')}>
        <Image
          src={image}
          alt={title}
          className="aspect-[4/2.5] w-full object-cover group-hover:scale-105 transition-all duration-500 cursor-pointer"
        />
        <div className="flex flex justify-between items-center p-3 gap-2 bg-white relative">
          <p className="font-semibold text-sm  text-[#28262EB2]">{title}</p>
          <QRIcon className="icon text-xl shrink-0" style={{ '--color-icon': '#28262EB2' }} />
        </div>
      </div>
    </div>
  )
}

export function ZupassTickets(props: Props) {
  const zupass = useZupass()
  const [ticket, setTicket] = useState<any>()
  const [swag, setSwag] = useState<any>()
  const [collectibles, setCollectibles] = useState<any>()

  let className = 'flex flex-col lg:flex-row gap-2 basis-full shrink-0 md:basis-1/2 mt-0'
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
      {/* <div className="flex flex-col gap-2 shrink-0 lg:basis-auto"> */}
      <div className="flex justify-between font-semibold py-2 lg:hidden">
        <div>Ticket</div>
      </div>
      <div
        className="flex flex-col lg:mr-2 self-start justify-between relative aspect-[361/385] shrink-0 max-w-[450px] text-black overflow-hidden rounded-2xl"
        data-type="ticket"
      >
        <div className={cn('rounded-2xl', css['mask'])}></div>
        <div className={cn('rounded-2xl', css['border'])}></div>
        <div className="absolute inset-0 h-[53%] overflow-hidden rounded-2xl">
          <Image src={TicketBackground} alt="Devcon logo flowers" className="h-full object-contain object-right" />
        </div>

        <div className="flex flex-col h-[53%] shrink-0 justify-between p-4 relative max-w-[65%] pl-4 border-dashed border-b border-[#D9D9D9]">
          <div className="h-[23%]">
            <Image src={LogoFlowers} alt="Devcon logo flowers" className="h-full object-contain object-left" />
          </div>
          <div className="flex flex-col justify-center grow">
            <div className="text-lg lg:text-2xl break-words">{ticket?.attendeeName || 'Devcon Attendee'}</div>
            <span className="text-[#5B5F84]">{ticket?.ticketType || 'Ticket'}</span>
          </div>
          <div className="bold uppercase h-[20%] text-xs flex items-end">Devcon.org</div>
        </div>

        <div className="grow p-4 h-[47%] w-full flex justify-between">
          <div className="sm:p-3 p-4 border border-solid border-[#D9D9D9] shrink-0 rounded-2xl self-end">
            {!ticket?.ticketSecret && <div className="text-center text-sm text-gray-500">No ticket secret</div>}
            {ticket?.ticketSecret && ticket?.isConsumed && (
              <div className="text-center text-sm text-gray-500">Ticket already consumed</div>
            )}

            {ticket?.ticketSecret && !ticket?.isConsumed && (
              <div
                className="max-w-[105px] sm:max-w-[150px]"
                style={{ height: 'auto', margin: '0 auto', width: '100%' }}
              >
                <QRCode
                  size={256}
                  style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                  value={ticket?.ticketSecret || ''}
                  viewBox={`0 0 256 256`}
                />
              </div>
            )}
            {/* <QRCode value={ticket?.getValue('ticketSecret')?.value || ''} size={125} level="H" /> */}
          </div>
          <div className="flex flex-col justify-between p-1">
            <Image src={WhenImage} alt="When" className="w-[120px] self-end object-contain object-right mb-2" />
            <div className="ml-2 text-[9px] sm:text-xs shrink-0 text-right text-[#99A0AE] leading-4">
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
      {/* </div> */}
      <div className="flex flex-col grow  h-full rounded-2xl lg:bg-white lg:border lg:border-solid border-[#E1E4EA] hidden">
        <div className="flex font-semibold pb-4 py-2 lg:p-4 lg:pb-0">
          <div>Swag</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-2 gap-2 lg:p-4 pt-0 font-secondary">
          <SwagCard
            title="Permissionless Innovation Devcon Reunion Tour T-shirt"
            to="/"
            description="Description"
            image={Shirt}
          />
          <SwagCard
            title={
              <>
                Infinite Garden <br /> Herbal Inhaler
              </>
            }
            to="/"
            description="Description"
            image={Herbal}
          />
          <SwagCard
            title={
              <>
                Dark Forest <br /> Lantern Builder Kit
              </>
            }
            to="/"
            description="Description"
            image={Lantern}
          />
          <SwagCard
            title={
              <>
                Make Ethereum <br /> Cypherpunk Raincoat
              </>
            }
            to="/"
            description="Description"
            image={Raincoat}
          />
          <SwagCard
            title={
              <>
                Devcon SEA <br /> Thai Flow pants
              </>
            }
            to="/"
            description="Description"
            image={Pants}
          />
        </div>
      </div>
    </div>
  )
}
