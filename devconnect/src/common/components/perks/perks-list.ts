import DevconSeaAttendee from './images/devcon-sea-attendee.png'
import CoworkingImage from 'assets/images/ba/voxel-cards/co-working-image.png'
import CommunityImage from 'assets/images/ba/voxel-cards/community-events-image.png'
import ETHDayImage from 'assets/images/ba/voxel-cards/eth-day-image.png'
import WorldsFairImage from 'assets/images/ba/voxel-cards/worlds-fair-image.png'
import CoreDevsImage from './images/pg.png'
import EtherfiImage from './images/etherfi.png'
import EdgeCityImage from './images/edgecity.png'
import BeTrustyImage from './images/betrusty.jpg'
import RoamlessImage from './images/roamless-banner.png'
import AlephImage from './images/aleph-updated.png'
import PrecogImage from './images/precog.png'
import DoubleTreeImage from './images/hilton.jpg'
import VanAlImage from './images/van-al.jpg'
import TripshaImage from './images/tripsha-1.jpeg'
import TripshaCar from './images/tripsha-car.jpeg'
import Ready1Image from './images/ready-1.png'
import Ready2Image from './images/ready-2.png'
import PoloImage from './images/polo.jpg'
import KoinxImage from './images/koinx.jpg'
import GuestGenieImage from './images/guest-genie.jpg'
import NomadaCafeImage from './images/cafenomada.png'
import BanklessImage from './images/bankless-perk.png'
import MetanaImage from './images/metana.jpg'
import ChainstackImage from './images/chainstack.png'
import FortaImage from './images/forta.png'

type Perk = {
  coupon_collection: string
  name: string
  description: string
  requires?: string
  issuer: string
  image: any
  zupass_proof_id?: string
  external?: boolean
  urls?: { text: string; url: string }[]
  anchor?: string
  no_status?: boolean
  wallet_proof?: boolean
  global_coupon?: string
  instructions?: string
  zupass_disabled?: boolean
}

const perks: Perk[] = [
  {
    coupon_collection: 'devcon-sea-attendee',
    name: 'Devcon SEA Attendee Discount',
    description: 'Attended Devcon SEA? Get $21 off Devconnect ARG!',
    requires: 'Devcon SEA ticket',
    issuer: 'Devconnect Team',
    image: DevconSeaAttendee,
    zupass_proof_id: 'Devcon SEA',
  },
  {
    coupon_collection: 'roamless-e-sim-2025',
    name: 'Devconnect ARG E-sim',
    description: 'Free eSIM & Data for Argentina by Roamless',
    requires: 'Devconnect ARG ticket',
    issuer: 'Roamless',
    image: RoamlessImage,
    instructions: 'Use the code at checkout',
    urls: [
      {
        text: 'Visit Roamless',
        url: 'https://roamless.com',
      },
    ],
    zupass_proof_id: 'Devconnect ARG',
  },
  {
    coupon_collection: 'Devconnect ARG Telegram Chat',
    name: 'Devconnect ARG Telegram Chat',
    description: 'Join the Devconnect ARG Telegram Chat',
    requires: 'Devconnect ARG ticket',
    issuer: 'Devconnect Team',
    image: CoworkingImage,
    instructions: 'Follow the instructions at the following link:',
    external: true,
    urls: [
      {
        text: 'Telegram Chat',
        url: 'https://t.me/DevconPodBot?text=%2Fstart',
      },
    ],
    zupass_proof_id: 'Devconnect ARG',
  },
  {
    coupon_collection: 'test-net-faucet',
    name: 'Testnet Faucet',
    description: 'Free Sepolia and Hoodi ETH',
    requires: 'Devconnect ARG ticket',
    issuer: 'ethPandaOps',
    image: CommunityImage,
    external: true,
    urls: [
      {
        text: 'Sepolia Faucet',
        url: 'https://devconnect-sepolia-faucet.pk910.de/',
      },
      {
        text: 'Hoodi Faucet',
        url: 'https://devconnect-hoodi-faucet.pk910.de/',
      },
    ],
    zupass_proof_id: 'Devconnect ARG',
  },
  // EtherFI travel
  {
    coupon_collection: 'etherfi-travel-2025',
    name: 'ether.fi Travel',
    requires: 'Devconnect ARG ticket',
    description: 'Unlock Ether.fi Travel - Up to 60% off Hotels in Buenos Aires',
    issuer: 'ether.fi',
    image: EtherfiImage,
    instructions: 'Special rates available at the following link:',
    zupass_proof_id: 'Devconnect ARG',
    urls: [
      {
        text: 'Visit Ether.fi',
        url: 'https://travel.ether.fi/?utm_source=devconnect&utm_medium=affiliate&utm_campaign=perks',
      },
    ],
    global_coupon: 'https://travel.ether.fi/?utm_source=devconnect&utm_medium=affiliate&utm_campaign=perks',
  },
  {
    coupon_collection: 'betrusty-devconnect-2025',
    name: 'BeTrusty',
    requires: 'Devconnect ARG ticket',
    urls: [
      {
        text: 'Visit Betrusty',
        url: 'https://devconnect.betrusty.io/search',
      },
    ],
    description: 'Rent with Crypto in Buenos Aires - 0% Commission',
    issuer: 'BeTrusty',
    image: BeTrustyImage,
    instructions: 'Verify your ticket at checkout to claim your discount:',
    zupass_proof_id: 'Devconnect ARG',
    external: true,
  },
  {
    coupon_collection: 'double-tree-hilton',
    name: 'Hotel DoubleTree by Hilton',
    requires: 'Devconnect ARG ticket',
    description: 'Enjoy a special preferred rate - with full buffet breakfast',
    issuer: 'Hotel DoubleTree by Hilton',
    image: DoubleTreeImage,
    instructions: 'Special rates available at the following link:',
    zupass_proof_id: 'Devconnect ARG',
    urls: [
      {
        text: 'Visit Hilton',
        url: 'https://www.hilton.com/en/attend-my-event/buesidt-331-25996bb4-f1e0-42cd-81dd-6845d58a1368/',
      },
    ],
    global_coupon: 'https://www.hilton.com/en/attend-my-event/buesidt-331-25996bb4-f1e0-42cd-81dd-6845d58a1368/',
  },
  {
    coupon_collection: 'precog-2025',
    name: 'Precog',
    requires: 'Devconnect ARG ticket',
    description: 'Get MATE tokens, earn by predicting and redeem for prizes!',
    issuer: 'Precog',
    image: PrecogImage,
    zupass_proof_id: 'Devconnect ARG',
    external: true,
    // global_coupon: 'https://core.precog.market/claim/8453/mate?ref=devconnect',
    urls: [
      {
        text: 'Visit Precog',
        url: 'https://core.precog.market/claim/8453/mate?ref=devconnect',
      },
    ],
  },
  {
    coupon_collection: 'ready-lite',
    name: 'Ready Free',
    description: 'Free Ready Lite Card',
    requires: 'Devconnect ARG ticket',
    zupass_proof_id: 'Devconnect ARG',
    instructions: 'Unlock your crypto card for free',
    urls: [
      {
        text: 'Visit Ready',
        url: 'https://www.ready.co/download-ready?utm_source=devconnect&utm_campaign=lite_free',
      },
    ],
    issuer: 'Ready',
    image: Ready1Image,
  },
  {
    coupon_collection: 'ready-metal',
    name: 'Ready Metal',
    description: '30% off Ready Metal Card',
    requires: 'Devconnect ARG ticket',
    zupass_proof_id: 'Devconnect ARG',
    urls: [
      {
        text: 'Visit Ready',
        url: 'https://www.ready.co/download-ready?utm_source=devconnect&utm_campaign=metal_30',
      },
    ],
    issuer: 'Ready',
    instructions: 'Use the code at checkout',
    image: Ready2Image,
  },
  {
    coupon_collection: 'bankless-2025',
    name: 'Bankless',
    description: 'Get an exclusive 15% off Bankless Citizenship',
    requires: 'Devconnect ARG ticket',
    zupass_proof_id: 'Devconnect ARG',
    instructions: 'Use the code at checkout',
    urls: [
      {
        text: 'Visit Bankless',
        url: 'https://www.bankless.com/join',
      },
    ],
    global_coupon: 'DEVCON',
    issuer: 'Bankless',
    image: BanklessImage,
  },
  // Edge city
  {
    coupon_collection: 'edgy-city-patagonia-2025',
    name: 'Edge City Patagonia 2025',
    requires: 'Devconnect ARG ticket',
    description: '20% off Edge City Patagonia (Oct18 - Nov15)',
    issuer: 'Edge City',
    image: EdgeCityImage,
    zupass_proof_id: 'Devconnect ARG',
    global_coupon: 'ECP25-DEVCONNECT20',
    instructions: 'Use the code at checkout',
    urls: [
      {
        text: 'Edge City Patagonia',
        url: 'https://www.edgecity.live/patagonia',
      },
    ],
  },
  {
    coupon_collection: 'nomada-cafe-2025',
    name: 'Nómada Café',
    description: '10% OFF on all menu items at Nómada Café',
    requires: 'Devconnect ARG ticket',
    zupass_proof_id: 'Devconnect ARG',
    instructions: 'Use the code in store',
    urls: [
      {
        text: 'View Instagram',
        url: 'https://www.instagram.com/cafe.nomada.ar/',
      },
    ],
    global_coupon: 'devconnect2025',
    issuer: 'Nómada Café',
    image: NomadaCafeImage,
  },
  {
    coupon_collection: 'van-al',
    name: 'Van Al Aeropuerto',
    requires: 'Devconnect ARG ticket',
    description: '10% Off - Airport Transport, Crypto Welcome',
    issuer: 'Van Al Aeropuerto',
    image: VanAlImage,
    instructions: 'Use the code at checkout',
    zupass_proof_id: 'Devconnect ARG',
    urls: [
      {
        text: 'Visit Van Al Aeropuerto',
        url: 'https://ar.vanalaeropuerto.com/ ',
      },
    ],
    global_coupon: 'DEVCONVAN10',
  },
  {
    coupon_collection: 'tripsha-hotels',
    name: 'Tripsha Hotels',
    requires: 'Devconnect ARG ticket',
    description: 'Stay at Hotels with other Attendees, Save $$!',
    issuer: 'Tripsha',
    image: TripshaImage,
    instructions: 'Book your hotel here',
    zupass_proof_id: 'Devconnect ARG',
    external: true,
    urls: [
      {
        text: 'Visit Tripsha',
        url: 'https://app.tripsha.com/event/6852ea340dc16200084a6a71',
      },
    ],
  },
  {
    coupon_collection: 'tripsha-car',
    name: 'Tripsha Transport',
    requires: 'Devconnect ARG ticket',
    description: 'Venues & Transport for Orgs, Individuals & Groups',
    issuer: 'Tripsha',
    image: TripshaCar,
    instructions: 'Book your transport here',
    zupass_proof_id: 'Devconnect ARG',
    external: true,
    urls: [
      {
        text: 'Visit Tripsha',
        url: 'https://app.tripsha.com/event/68cd411de35f2900024f7f53',
      },
    ],
  },
  {
    coupon_collection: 'aleph-devconnect-2025',
    name: 'Aleph Cloud',
    description: 'Cloud service credits by Aleph Cloud',
    requires: 'Devconnect ARG ticket',
    issuer: 'Aleph Cloud',
    image: AlephImage,
    zupass_proof_id: 'Devconnect ARG',
  },
  {
    coupon_collection: 'koinx-2025',
    name: 'Koinx',
    description: 'FREE Crypto Tax Reports for first 500 users!',
    requires: 'Devconnect ARG ticket',
    zupass_proof_id: 'Devconnect ARG',
    instructions: 'Use code at Tax Report checkout',
    global_coupon: 'DEVCONNECT',
    urls: [
      {
        text: 'Visit Koinx',
        url: 'https://app.koinx.com/?r=perks-portal&d=DEVCONNECT',
      },
    ],
    issuer: 'KoinX',
    image: KoinxImage,
  },
  {
    coupon_collection: 'argentinapoloday-2025',
    name: 'Argentina Polo Day',
    description: 'Get 10% off on any polo experience',
    requires: 'Devconnect ARG ticket',
    zupass_proof_id: 'Devconnect ARG',
    issuer: 'Argentina Polo Day',
    global_coupon: 'DEVCONPOLO10',
    instructions: 'Refer to code during enquiry',
    urls: [
      {
        text: 'Visit Argentina Polo Day',
        url: 'https://argentinapoloday.com.ar/',
      },
    ],
    image: PoloImage,
  },

  {
    coupon_collection: 'guest-genie-2025',
    name: 'Guest Genie',
    description: '15% off Virtual Concierge - Experience BA like a Local',
    requires: 'Devconnect ARG ticket',
    zupass_proof_id: 'Devconnect ARG',
    instructions: 'Use the code at checkout',
    urls: [
      {
        text: 'Visit Guest Genie',
        url: 'https://guestgenie.com/',
      },
    ],
    global_coupon: 'devcon15',
    issuer: 'GuestGenie',
    image: GuestGenieImage,
  },

  {
    coupon_collection: 'chainstack-2025',
    name: 'Chainstack',
    description: 'Free Growth plan for 3 months',
    requires: 'Devconnect ARG ticket',
    zupass_proof_id: 'Devconnect ARG',
    instructions: 'Register and use the code at checkout',
    urls: [
      {
        text: 'Visit Chainstack',
        url: 'https://chainstack.com/',
      },
    ],
    global_coupon: 'DEVARG25',
    issuer: 'Chainstack',
    image: ChainstackImage,
  },

  {
    coupon_collection: 'metana-2025',
    name: 'Metana',
    description: 'Get $20% off on all Metana Web3 Bootcamps!',
    requires: 'Devconnect ARG ticket',
    zupass_proof_id: 'Devconnect ARG',
    instructions: 'Use the code at checkout',
    urls: [
      {
        text: 'Visit Metana',
        url: 'https://metana.io/web3-solidity-bootcamp-ethereum-blockchain/',
      },
    ],
    global_coupon: 'DCXMETANA',
    issuer: 'Metana',
    image: MetanaImage,
  },

  {
    coupon_collection: 'forta-2025',
    name: 'Forta',
    description: 'Security & Compliance 50% off!',
    requires: 'Devconnect ARG ticket',
    zupass_proof_id: 'Devconnect ARG',
    instructions: 'Use the code at checkout',
    urls: [
      {
        text: 'Visit Forta',
        url: 'https://www.forta.org/',
      },
    ],
    global_coupon: 'FORTDEVCON50',
    issuer: 'Forta',
    image: FortaImage,
  },

  {
    coupon_collection: 'protocol-guild-free-ticket',
    // Technically not a zupass proof ID, but it's an exception so not worth the effort to rename this field
    zupass_proof_id: 'PG Wallet Ownership',
    name: 'Core Devs / Protocol Guild free ticket',
    description: 'Core Devs / Protocol Guild free ticket',
    requires: 'Whitelisted address',
    issuer: 'Devconnect Team',
    image: CoreDevsImage,
    // Just bypass the connection requirement by calling it external (even if it isn't)
    external: true,
    no_status: true,
    wallet_proof: true,
  },
  {
    coupon_collection: 'create-your-own',
    name: 'Create Your Own Perk',
    description: 'Contact us to create your own perk offering',
    requires: 'An amazing perk 🦄',
    issuer: 'YOUR BRAND',
    image: WorldsFairImage,
    anchor: '#yourperk',
  },
]

export default perks
