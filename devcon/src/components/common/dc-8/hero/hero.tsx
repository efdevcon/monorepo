import React from 'react'
import Image from 'next/image'
import BannerImage from 'components/domain/landing-page/images/devcon-india-banner.png'
import TicketCard from 'components/domain/landing-page/images/ticket-card.png'
import TicketBack from 'components/domain/ticket-sharing/ticket-backside.png'
import IconX from 'assets/icons/twitter.svg'
import IconInstagram from 'assets/icons/instagram.svg'
import IconTelegram from 'assets/icons/telegram.svg'
import IconEmail from 'assets/icons/ui-email.svg'
import { Link } from 'components/common/link'
import useGetElementHeight from 'hooks/useGetElementHeight'

export const Hero = () => {
  const stripHeight = useGetElementHeight('strip')

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Background image */}
      <Image
        src={BannerImage}
        alt="Devcon 8 Mumbai India"
        fill
        priority
        placeholder="blur"
        className="object-cover object-top"
        style={{ paddingTop: stripHeight }}
      />

      {/* Edge gradients for smooth blending */}
      <div
        className="absolute bottom-0 left-0 w-full h-[150px] mix-blend-hard-light"
        style={{
          background: 'linear-gradient(to top, rgba(34,17,68,1) 4.5%, rgba(34,17,68,0) 100%)',
        }}
      />
      <div
        className="absolute top-0 left-0 h-full w-[160px] mix-blend-hard-light"
        style={{
          background: 'linear-gradient(to right, rgba(34,17,68,1) 0%, rgba(34,17,68,0) 100%)',
        }}
      />
      <div
        className="absolute top-0 right-0 h-full w-[160px] mix-blend-hard-light"
        style={{
          background: 'linear-gradient(to left, rgba(34,17,68,1) 0%, rgba(34,17,68,0) 100%)',
        }}
      />

      {/* Hero content at bottom */}
      <div className="absolute bottom-0 left-0 right-0 pb-8 lg:pb-12">
        <div className="section">
          <div className="flex items-end justify-between">
            {/* Left: Location + Social */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-white" style={{ textShadow: '0 2px 12px rgba(34,17,68,1)' }}>
                <h1 className="text-3xl lg:text-[32px] font-extrabold leading-[1.2] tracking-[-0.5px]">
                  Mumbai, India
                </h1>
                <p className="text-xl lg:text-2xl tracking-[-0.5px]">3—6 November, 2026</p>
              </div>

              <div className="backdrop-blur-[2px] bg-[rgba(26,13,51,0.8)] border border-[rgba(255,255,255,0.1)] flex gap-4 items-center px-4 py-2 rounded-lg w-fit [&_path]:!fill-white">
                <span className="text-white text-base">Follow us</span>
                <Link to="https://x.com/efdevcon" className="text-white hover:text-white/80 transition-colors">
                  <IconX className="w-[18px] h-[18px]" />
                </Link>
                <Link to="https://instagram.com/efdevcon" className="text-white hover:text-white/80 transition-colors">
                  <IconInstagram className="w-[18px] h-[18px]" />
                </Link>
                <Link to="https://t.me/devcon_SEA" className="text-white hover:text-white/80 transition-colors">
                  <IconTelegram className="w-[18px] h-[18px]" />
                </Link>
                <Link to="mailto:devcon@ethereum.org" className="text-white hover:text-white/80 transition-colors">
                  <IconEmail className="w-[18px] h-[18px]" />
                </Link>
              </div>
            </div>

            {/* Right: Ticket card with fan-out effect */}
            <Link to="/tickets" className="hidden md:flex flex-col gap-3 items-center w-[348px] shrink-0 group">
              <div className="relative w-[338px] h-[190px]">
                {/* Back ticket - fans out on hover */}
                <div
                  className="absolute inset-0 origin-center scale-[0.90] transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-[-9deg] group-hover:translate-x-[0px] group-hover:translate-y-[2px] group-hover:scale-[0.93]"
                  style={{ filter: 'drop-shadow(0 8px 20px rgba(0, 0, 0, 0.3))' }}
                >
                  <Image src={TicketBack} alt="" width={338} height={190} />
                </div>
                {/* Front ticket */}
                <div
                  className="absolute inset-0 transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ filter: 'drop-shadow(0 12px 30px rgba(0, 0, 0, 0.4))' }}
                >
                  <Image src={TicketCard} alt="Devcon Early Bird Ticket" width={338} height={190} />
                </div>
              </div>
              <p className="text-white font-bold text-base text-center translate-y-[0px] group-hover:translate-y-[8px] transition-transform duration-300">
                Local Early Bird tickets now available!
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
