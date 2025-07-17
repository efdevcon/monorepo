import DevconSeaAttendee from './images/devcon-sea-attendee.png'
import CoworkingImage from 'assets/images/ba/voxel-cards/co-working-image.png'
import CommunityImage from 'assets/images/ba/voxel-cards/community-events-image.png'
import ETHDayImage from 'assets/images/ba/voxel-cards/eth-day-image.png'
import WorldsFairImage from 'assets/images/ba/voxel-cards/worlds-fair-image.png'

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
  // {
  //   coupon_collection: 'Devconnect ARG E-sim',
  //   name: 'Devconnect ARG E-sim',
  //   description: 'E-sim by Roamless. Get 10% off.',
  //   requires: 'Devconnect ARG ticket',
  //   issuer: 'Roamless',
  //   image: CoworkingImage,
  //   zupass_proof_id: 'Devconnect ARG',
  // },
  {
    coupon_collection: 'Devconnect ARG Telegram Chat',
    name: 'Devconnect ARG Telegram Chat',
    description: 'Join the Devconnect ARG Telegram Chat',
    requires: 'Devconnect ARG ticket',
    issuer: 'Devconnect Team',
    image: CoworkingImage,
    external: true,
    urls: [{
      text: 'Telegram Chat',
      url: 'https://t.me/DevconPodBot?text=%2Fstart',
    }],
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
    urls: [{
      text: 'Sepolia Faucet',
      url: 'https://devconnect-sepolia-faucet.pk910.de/',
    }, {
      text: 'Hoodi Faucet',
      url: 'https://devconnect-hoodi-faucet.pk910.de/',
    }],
    zupass_proof_id: 'Devconnect ARG',
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