import Image from 'next/image'
import TicketPrism from './dc7/ticket-prism.png'
import LogoFlowers from 'assets/images/dc-7/logo-flowers.png'
import Aria from './dc7/Aria.png'
import Cat from './dc7/Cat.png'
import Deva from './dc7/Deva.png'
import Doggo from './dc7/Doggo.png'
import Lyra from './dc7/Lyra.png'

import CoreProtocol from 'assets/images/programming/CoreProtocol.png'
import Cypherpunk from 'assets/images/programming/Cypherpunk.png'
import Usability from 'assets/images/programming/Usability.png'
import RealWorldEthereum from 'assets/images/programming/RealWorldEthereum.png'
import AppliedCryptography from 'assets/images/programming/AppliedCryptography.png'
import CryptoEconomics from 'assets/images/programming/CryptoEconomics.png'
import Coordination from 'assets/images/programming/Coordination.png'
import DeveloperExperience from 'assets/images/programming/DeveloperExperience.png'
import Security from 'assets/images/programming/Security.png'
import Layer2 from 'assets/images/programming/Layer2.png'

export type TicketProps = {
  name: string
  ticketType: string
}

export type SpeakerProps = {
  id: string
  title: string
  type: string
  track: string
  speakers: { name: string; avatar: string }[]
}

function getTrackImage(track: string) {
  switch (track) {
    case 'Core Protocol':
      return CoreProtocol
    case 'Cypherpunk & Privacy':
      return Cypherpunk
    case 'Usability':
      return Usability
    case 'Real World Ethereum':
      return RealWorldEthereum
    case 'Applied Cryptography':
      return AppliedCryptography
    case 'Cryptoeconomics':
      return CryptoEconomics
    case 'Coordination':
      return Coordination
    case 'Developer Experience':
      return DeveloperExperience
    case 'Security':
      return Security
    case 'Layer 2':
      return Layer2
    default:
      return RealWorldEthereum
  }
}

export const Ticket = (props: TicketProps) => {
  const heroes = [Aria, Cat, Doggo, Deva, Lyra]
  const firstLetter = props.name[0].toUpperCase()
  const alphabetIndex = firstLetter.charCodeAt(0) - 'A'.charCodeAt(0)
  const heroIndex = alphabetIndex % heroes.length
  const selectedHero = heroes[heroIndex >= 0 ? heroIndex : 0]

  return (
    <div
      // TODO: Adjust aspect as needed for social sharing
      className="flex justify-between items-evenly relative rounded-xl aspect-[16/8] w-[550px] max-w-full text-black border-[#F8F9FE] overflow-hidden shadow-xl"
      data-type="ticket"
    >
      <div
        style={{
          WebkitMask: 'radial-gradient(circle at left, transparent 20px, black 21px)',
        }}
        className="absolute left-0 w-[52%] h-full bg-[#F8F9FE]"
      ></div>
      <div
        style={{
          WebkitMask: 'radial-gradient(circle at right, transparent 20px, black 21px)',
        }}
        className="absolute right-0 w-[52%] h-full bg-[#F8F9FE]"
      ></div>

      <div
        style={{
          WebkitMask: 'radial-gradient(circle at right, transparent 20px, black 21px)',
        }}
        className="absolute left-1/2 top-0 bottom-0 right-0"
      >
        <Image src={TicketPrism} alt="Devcon logo flowers" className="h-full object-cover object-left" />
      </div>
      <div className="flex flex-col justify-between p-4 relative max-w-[75%] lg:max-w-[50%] pl-8">
        <div className="h-[20%]">
          <Image src={LogoFlowers} alt="Devcon logo flowers" className="h-full object-contain object-left" />
        </div>
        <div className="flex flex-col justify-center grow">
          <div className="text-lg lg:text-2xl">{props.name}</div>
          <span className="text-[#5B5F84] text-xs mt-4">
            Attending Devcon: the schelling point for the Ethereum community
          </span>
        </div>
        <div className="bold uppercase h-[20%] text-xs flex items-end">Devcon.org</div>
      </div>
      <div className="flex flex-col relative w-[37%] shrink-0 h-full p-4 border-l-2 border-l-solid border-dashed border-[#D9D9D9]">
        <div className="flex flex-col justify-end items-end text-sm">
          <div className="leading-3 bold uppercase text-xs text-nowrap text-[#5B5F84]">Bangkok, Thailand</div>
          <div className="text-sm text-nowrap">
            <span className="text-[#6B54AB]">12 — 15</span> Nov, 2024
          </div>
        </div>
      </div>

      <div
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
      </div>
    </div>
  )
}

export const SpeakerTicket = (props: SpeakerProps) => {
  if (!props) return null

  const trackImage = getTrackImage(props.track)
  const titleClassName = props.title.length > 100 ? 'text-sm lg:text-lg' : 'text-lg lg:text-xl'

  return (
    <div
      // TODO: Adjust aspect as needed for social sharing
      className="flex justify-between items-evenly relative rounded-xl aspect-[16/8] w-[550px] max-w-full text-black border-[#F8F9FE] overflow-hidden shadow-xl"
      data-type="ticket"
    >
      <div className="absolute left-0 w-[52%] h-full bg-[#F8F9FE]"></div>
      <div className="absolute right-0 w-[52%] h-full bg-[#F8F9FE]"></div>
      <div className="absolute left-1/2 top-0 bottom-0 right-0">
        <Image src={TicketPrism} alt="Devcon logo flowers" className="h-full object-cover object-left" />
      </div>
      <div className="absolute h-full w-full z-10">
        <Image
          src={trackImage}
          alt={`Devcon Track`}
          className={`absolute h-[80%] lg:h-[90%] -right-12 -bottom-6 object-contain object-right-bottom w-full`}
        />
      </div>

      <div className="flex flex-col justify-between p-4 relative pl-8">
        <div className="flex flex-row w-full justify-between items-start">
          <div>
            <Image src={LogoFlowers} alt="Devcon logo flowers" className="h-12 object-contain object-left" />
          </div>
          <div className="flex flex-col justify-end items-end text-sm">
            <div className="leading-3 bold uppercase text-xs text-nowrap text-[#5B5F84]">Bangkok, Thailand</div>
            <div className="text-sm text-nowrap">
              <span className="text-[#6B54AB]">12 — 15</span> Nov, 2024
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center grow h-40 max-w-72">
          <div className={titleClassName}>{props.title}</div>
        </div>
        <div className="shrink-0 w-full my-2 border-t-2 border-t-solid border-dashed border-[#D9D9D9]"></div>
        <div className="shrink-0 my-2 text-[#5B5F84] text-xs">{props.speakers.map(i => i.name).join(', ')}</div>
        <div className="shrink-0 bold text-xs">{props.track}</div>
      </div>
    </div>
  )
}
