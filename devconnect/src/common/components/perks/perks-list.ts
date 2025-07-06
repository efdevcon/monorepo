const perks = [
  {
    coupon_collection: 'devcon-sea-attendee',
    name: 'Devcon SEA Attendee Discount',
    description: 'If you attended Devcon SEA, you can get a discount on your Devconnect ARG ticket.',
    image: 'https://devcon.org/images/devcon-sea.png',
    zupass_proof_id: 'Devcon SEA',
  },
  {
    coupon_collection: 'Devconnect ARG E-sim',
    name: 'Devconnect ARG E-sim',
    description: 'If you hold a Devconnect ticket, you can get a discount on an e-sim.',
    image: 'https://devcon.org/images/devcon-sea.png',
    zupass_proof_id: 'Devconnect ARG',
  },
  {
    coupon_collection: 'Sepolia Faucet',
    name: 'Sepolia Faucet',
    description: 'If you hold a Devconnect ticket, you can claim some free Sepolia ETH.',
    image: 'https://devcon.org/images/devcon-sea.png',
    external: true,
    url: 'https://faucet.sepolia.devconnect.org',
  },
]

export default perks