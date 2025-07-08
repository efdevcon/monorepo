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
  url?: string
  anchor?: string
}

const perks: Perk[] = [
  {
    coupon_collection: 'devcon-sea-attendee',
    name: 'Devcon SEA Attendee Discount',
    description: 'Attended Devcon SEA? Get X% off Devconnect ARG!',
    requires: 'Devcon SEA ticket',
    issuer: 'Devconnect Team',
    image: DevconSeaAttendee,
    zupass_proof_id: 'Devcon SEA',
  },
//   {
//     coupon_collection: 'Devconnect ARG E-sim',
//     name: 'Devconnect ARG E-sim',
//     description: 'If you hold a Devconnect ticket, you can get a discount on an e-sim.',
//     requires: 'Devconnect ticket',
//     issuer: 'Devconnect Team',
//     image: CoworkingImage,
//     zupass_proof_id: 'Devconnect ARG',
//   },
//   {
//     coupon_collection: 'Sepolia Faucet',
//     name: 'Sepolia Faucet',
//     description: 'If you hold a Devconnect ticket, you can claim some free Sepolia ETH.',
//     requires: 'Devconnect ticket',
//     issuer: 'Devconnect Team',
//     image: CommunityImage,
//     external: true,
//     url: 'https://faucet.sepolia.devconnect.org',
//   },
  {
    coupon_collection: 'create-your-own',
    name: 'Create Your Own Perk',
    description: 'Contact us to create your own perk offering.',
    // requires: 'Devconnect ticket',
    issuer: 'YOUR BRAND',
    image: WorldsFairImage,
    anchor: '#yourperk',
    // zupass_proof_id: 'Devconnect ARG',
  },
]

export default perks