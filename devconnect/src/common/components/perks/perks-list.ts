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

  // EtherFI travel
  {
    coupon_collection: 'etherfi-travel-2025',
    name: 'ether.fi Travel',
    requires: 'Devconnect ARG ticket',
    description: 'Unlock Ether.fi Travel - Up to 60% off Hotels in Buenos Aires',
    issuer: 'ether.fi',
    image: EtherfiImage,
    instructions: 'Special rates available when following the link:',
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
    coupon_collection: 'aleph-devconnect-2025',
    name: 'Aleph Cloud',
    description: 'Cloud service credits by Aleph Cloud',
    requires: 'Devconnect ARG ticket',
    issuer: 'Aleph Cloud',
    image: AlephImage,
    zupass_proof_id: 'Devconnect ARG',
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
