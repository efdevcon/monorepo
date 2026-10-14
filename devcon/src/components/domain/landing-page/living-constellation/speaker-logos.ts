import type { StaticImageData } from 'next/image'
import OneClaw from './images/logos/1claw.svg'
import Ack3 from './images/logos/ack3.svg'
import Arkiv from './images/logos/arkiv.svg'
import Aztec from './images/logos/aztec.svg'
import Circle from './images/logos/circle.svg'
import Coinbase from './images/logos/coinbase.svg'
import EdgeCity from './images/logos/edge-city.svg'
import EthereumFoundation from './images/logos/ethereum-foundation.svg'
import ethlabs from './images/logos/ethlabs.png'
import Freedom from './images/logos/freedom.svg'
import Giga from './images/logos/giga.svg'
import Giveth from './images/logos/giveth.svg'
import Lfdt from './images/logos/lfdt.svg'
import libp2p from './images/logos/libp2p.png'
import MetaMask from './images/logos/metamask.svg'
import Monad from './images/logos/monad.svg'
import Nethermind from './images/logos/nethermind.svg'
import Nouns from './images/logos/nouns.svg'
import PhantomZone from './images/logos/phantom-zone.svg'
import Polygon from './images/logos/polygon.svg'
import ProtocolGuild from './images/logos/protocol-guild.svg'
import TalTech from './images/logos/taltech.svg'
import Tor from './images/logos/tor.svg'
import Unicef from './images/logos/unicef.svg'
import Veridise from './images/logos/veridise.svg'
import Web3PrivacyNow from './images/logos/web3privacy-now.svg'
import Zisk from './images/logos/zisk.svg'

// Organisation logos for the speaker cards, keyed by the `logo` field in
// speakers-allowlist.ts (which stays free of image imports so the pull script
// can load it). SVGs under images/ become React components (svgr); `aspect`
// is the viewBox ratio, used to size wide wordmarks and square marks to a
// similar visual weight; `scale` is an optical nudge for marks that read
// lighter than their box. Raster logos go through next/image instead.
export type SpeakerLogo = { scale?: number } & (
  | { Logo: React.ComponentType<React.SVGProps<SVGSVGElement>>; aspect: number; image?: never }
  | { image: StaticImageData; Logo?: never; aspect?: never }
)

export const SPEAKER_LOGOS = {
  '1claw': { Logo: OneClaw, aspect: 610 / 128 },
  ack3: { Logo: Ack3, aspect: 507 / 128 },
  arkiv: { Logo: Arkiv, aspect: 347 / 80 },
  aztec: { Logo: Aztec, aspect: 499 / 128 },
  circle: { Logo: Circle, aspect: 500 / 128 },
  coinbase: { Logo: Coinbase, aspect: 717 / 128 },
  'edge-city': { Logo: EdgeCity, aspect: 254 / 128 },
  'ethereum-foundation': { Logo: EthereumFoundation, aspect: 402 / 128 },
  ethlabs: { image: ethlabs },
  freedom: { Logo: Freedom, aspect: 466 / 95 },
  giga: { Logo: Giga, aspect: 274 / 128 },
  giveth: { Logo: Giveth, aspect: 623 / 128 },
  lfdt: { Logo: Lfdt, aspect: 597 / 128 },
  libp2p: { image: libp2p },
  metamask: { Logo: MetaMask, aspect: 133 / 128 },
  monad: { Logo: Monad, aspect: 676 / 128 },
  nethermind: { Logo: Nethermind, aspect: 755 / 128 },
  nouns: { Logo: Nouns, aspect: 341 / 128 },
  'phantom-zone': { Logo: PhantomZone, aspect: 128 / 128 },
  polygon: { Logo: Polygon, aspect: 464 / 128 },
  'protocol-guild': { Logo: ProtocolGuild, aspect: 1106 / 128 },
  taltech: { Logo: TalTech, aspect: 228 / 128 },
  tor: { Logo: Tor, aspect: 211 / 128 },
  unicef: { Logo: Unicef, aspect: 539 / 128 },
  veridise: { Logo: Veridise, aspect: 567 / 128 },
  'web3privacy-now': { Logo: Web3PrivacyNow, aspect: 465 / 128 },
  zisk: { Logo: Zisk, aspect: 288 / 128 },
} satisfies Record<string, SpeakerLogo>

export type SpeakerLogoKey = keyof typeof SPEAKER_LOGOS
