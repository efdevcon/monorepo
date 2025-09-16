export interface POI {
  id: string
  name: string
  category: string
  description: string
  details?: string
  currentEvent?: string
  capacity?: string
  amenities?: string[]
  heroImage?: string
  logo?: string
  companyDescription?: string
  companies?: string[]
}

export const pois: POI[] = [
  // DeFi District - Individual Companies
  { 
    id: 'defi-pancake-swap', name: 'PancakeSwap', category: 'defi',
    description: 'Decentralized exchange and automated market maker',
    amenities: ['DEX Trading', 'Yield Farming', 'Lottery', 'NFT Marketplace'],
    companyDescription: 'Leading decentralized exchange on BNB Chain with innovative DeFi products.',
    logo: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=100&h=100&fit=crop&crop=center',
    heroImage: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=400&fit=crop'
  },
  { 
    id: 'defi-lido', name: 'Lido Finance', category: 'defi',
    description: 'Liquid staking solution for Ethereum',
    amenities: ['Liquid Staking', 'Staking Rewards', 'DeFi Integration'],
    companyDescription: 'Secure liquid staking protocol enabling staking without lockups.',
    logo: 'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=100&h=100&fit=crop&crop=center',
    heroImage: 'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=800&h=400&fit=crop'
  },
  { 
    id: 'defi-yearn', name: 'Yearn Finance', category: 'defi',
    description: 'Automated yield farming and DeFi aggregation',
    amenities: ['Yield Optimization', 'Vault Strategies', 'Risk Management'],
    companyDescription: 'Automated yield farming protocol optimizing DeFi returns.',
    logo: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=100&h=100&fit=crop&crop=center',
    heroImage: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=400&fit=crop'
  },
  { 
    id: 'defi-aave', name: 'Aave Protocol', category: 'defi',
    description: 'Decentralized lending and borrowing platform',
    amenities: ['Lending', 'Borrowing', 'Flash Loans', 'Staking'],
    companyDescription: 'Leading decentralized lending protocol with innovative flash loan technology.',
    logo: 'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=100&h=100&fit=crop&crop=center',
    heroImage: 'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=800&h=400&fit=crop'
  },
  { 
    id: 'defi-uniswap', name: 'Uniswap', category: 'defi',
    description: 'Decentralized exchange protocol',
    amenities: ['DEX Trading', 'Liquidity Provision', 'Governance'],
    companyDescription: 'Pioneering decentralized exchange with automated market making.',
    logo: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=100&h=100&fit=crop&crop=center',
    heroImage: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=400&fit=crop'
  },
  { 
    id: 'defi-compound', name: 'Compound Finance', category: 'defi',
    description: 'Algorithmic interest rate protocol',
    amenities: ['Lending', 'Borrowing', 'Interest Rates', 'Governance'],
    companyDescription: 'Algorithmic interest rate protocol for lending and borrowing.',
    logo: 'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=100&h=100&fit=crop&crop=center',
    heroImage: 'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=800&h=400&fit=crop'
  },
  {
    id: 'defi-makerdao', name: 'MakerDAO', category: 'defi',
    description: 'Decentralized stablecoin and lending platform',
    amenities: ['DAI Stablecoin', 'CDP Vaults', 'Governance', 'Collateralization'],
    companyDescription: 'Decentralized organization behind the DAI stablecoin and lending platform.',
    logo: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=100&h=100&fit=crop&crop=center',
    heroImage: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=400&fit=crop'
  },
  {
    id: 'defi-curve', name: 'Curve Finance', category: 'defi',
    description: 'Stablecoin exchange and yield farming',
    amenities: ['Stablecoin Trading', 'Yield Farming', 'Liquidity Pools'],
    companyDescription: 'Efficient stablecoin exchange with low slippage and high yields.',
    logo: 'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=100&h=100&fit=crop&crop=center',
    heroImage: 'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=800&h=400&fit=crop'
  },

  // Food & Beverage
  { 
    id: 'fnb-1', name: 'Asado Express', category: 'fnb', 
    description: 'Traditional Argentine grilled meats and empanadas', 
    amenities: ['Asado BBQ', 'Fresh Empanadas', 'Chimichurri', 'Choripán'],
    companyDescription: 'Authentic Argentine asado experience featuring premium grilled meats.',
    logo: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=100&h=100&fit=crop&crop=center',
    heroImage: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=400&fit=crop'
  },
  { 
    id: 'fnb-2', name: 'Porteño Bites', category: 'fnb', 
    description: 'Buenos Aires street food and milanesas', 
    amenities: ['Milanesas', 'Provoleta', 'Medialunas', 'Mate Tea'],
    companyDescription: 'Classic Buenos Aires comfort food including crispy milanesas.',
    logo: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=100&h=100&fit=crop&crop=center',
    heroImage: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&h=400&fit=crop'
  },
  { 
    id: 'fnb-3', name: 'Dulce & Salado', category: 'fnb', 
    description: 'Argentine pastries and alfajores', 
    amenities: ['Alfajores', 'Facturas', 'Dulce de Leche', 'Cortado Coffee'],
    companyDescription: 'Traditional Argentine bakery specializing in alfajores and facturas.',
    logo: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=100&h=100&fit=crop&crop=center',
    heroImage: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&h=400&fit=crop'
  },
  { 
    id: 'fnb-4', name: 'Tokyo Ramen Bar', category: 'fnb', 
    description: 'Authentic Japanese ramen and gyoza', 
    amenities: ['Tonkotsu Ramen', 'Miso Ramen', 'Gyoza', 'Japanese Beer'],
    companyDescription: 'Authentic Japanese ramen experience with rich broths and handmade gyoza.',
    logo: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=100&h=100&fit=crop&crop=center',
    heroImage: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&h=400&fit=crop'
  },

  // Coworking Areas
  {
    id: 'cowork-1', name: 'Main Coworking Space', category: 'cowork',
    description: 'Primary flexible workspace area',
    amenities: ['WiFi', 'Power Outlets', 'Meeting Rooms', 'Phone Booths'],
    companyDescription: 'Spacious coworking area with modern amenities for productive work.'
  },
  {
    id: 'cowork-2', name: 'Quiet Zone', category: 'cowork',
    description: 'Silent workspace for focused work',
    amenities: ['Soundproofing', 'Individual Desks', 'Natural Light', 'Coffee Station'],
    companyDescription: 'Dedicated quiet space for deep work and concentration.'
  },
  {
    id: 'cowork-3', name: 'Collaboration Hub', category: 'cowork',
    description: 'Team workspace with whiteboards',
    amenities: ['Whiteboards', 'Projector', 'Team Tables', 'Brainstorming Area'],
    companyDescription: 'Dynamic space designed for team collaboration and creative sessions.'
  },
  {
    id: 'cowork-4', name: 'Innovation Lab', category: 'cowork',
    description: 'Advanced workspace with prototyping tools',
    amenities: ['3D Printer', 'Prototyping Tools', 'VR Setup', 'Workshop Area'],
    companyDescription: 'Cutting-edge workspace with tools for prototyping and innovation.'
  },
  {
    id: 'cowork-5', name: 'Meeting Pods', category: 'cowork',
    description: 'Private meeting spaces',
    amenities: ['Video Conferencing', 'Whiteboards', 'Privacy', 'Comfortable Seating'],
    companyDescription: 'Private meeting pods for confidential discussions and presentations.'
  },
  {
    id: 'cowork-6', name: 'Lounge Area', category: 'cowork',
    description: 'Relaxed workspace with comfortable seating',
    amenities: ['Comfortable Chairs', 'Coffee Tables', 'Casual Atmosphere', 'Networking Space'],
    companyDescription: 'Casual workspace perfect for networking and informal meetings.'
  },
  {
    id: 'cowork-7', name: 'Conference Room', category: 'cowork',
    description: 'Large meeting and presentation space',
    amenities: ['Projector', 'Audio System', 'Large Table', 'Presentation Equipment'],
    companyDescription: 'Professional conference room for large meetings and presentations.'
  },
  {
    id: 'cowork-8', name: 'Outdoor Workspace', category: 'cowork',
    description: 'Open-air workspace with natural light',
    amenities: ['Natural Light', 'Fresh Air', 'Outdoor Seating', 'WiFi'],
    companyDescription: 'Unique outdoor workspace combining productivity with natural surroundings.'
  },

  // Coffee Stations
  {
    id: 'coffee-1', name: 'Coffee Station', category: 'coffee',
    description: 'Premium coffee and refreshments',
    amenities: ['Espresso', 'Cold Brew', 'Tea Selection', 'Pastries'],
    companyDescription: 'Premium coffee station serving artisanal beverages and light snacks.'
  },
  {
    id: 'coffee-1_2', name: 'Coffee Station 2', category: 'coffee',
    description: 'Additional coffee and refreshment station',
    amenities: ['Espresso', 'Cold Brew', 'Tea Selection', 'Pastries'],
    companyDescription: 'Second coffee station for convenient access throughout the venue.'
  },
  {
    id: 'coffee-2', name: 'Coffee Station 3', category: 'coffee',
    description: 'Third coffee and refreshment station',
    amenities: ['Espresso', 'Cold Brew', 'Tea Selection', 'Pastries'],
    companyDescription: 'Third coffee station ensuring no long waits for caffeine.'
  },

  // BioTech District - Individual Companies
  {
    id: 'biotech-3-mile', name: '3 Mile Labs', category: 'biotech',
    description: 'Biotechnology research and development',
    amenities: ['Research Labs', 'DNA Sequencing', 'Clinical Trials', 'Data Analysis'],
    companyDescription: 'Cutting-edge biotechnology research facility focusing on genetic engineering.',
    logo: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=100&h=100&fit=crop&crop=center',
    heroImage: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&h=400&fit=crop'
  },
  {
    id: 'biotech-fukushima', name: 'Fukushima BioTech', category: 'biotech',
    description: 'Environmental biotechnology solutions',
    amenities: ['Environmental Testing', 'Bioremediation', 'Research Labs', 'Consulting'],
    companyDescription: 'Specialized in environmental biotechnology and sustainable solutions.',
    logo: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=100&h=100&fit=crop&crop=center',
    heroImage: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=400&fit=crop'
  },
  {
    id: 'biotech-chernobyl', name: 'Chernobyl Research', category: 'biotech',
    description: 'Radiation biology and medical research',
    amenities: ['Radiation Research', 'Medical Studies', 'Safety Protocols', 'Data Collection'],
    companyDescription: 'Leading research in radiation biology and medical applications.',
    logo: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=100&h=100&fit=crop&crop=center',
    heroImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=400&fit=crop'
  },
  {
    id: 'biotech-horde', name: 'Horde Biotech', category: 'biotech',
    description: 'Collaborative biotechnology platform',
    amenities: ['Collaborative Research', 'Data Sharing', 'Open Source', 'Community Labs'],
    companyDescription: 'Decentralized biotechnology research platform fostering collaboration.',
    logo: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=100&h=100&fit=crop&crop=center',
    heroImage: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=400&fit=crop'
  },
  {
    id: 'biotech-covenant', name: 'Covenant Health', category: 'biotech',
    description: 'Healthcare biotechnology solutions',
    amenities: ['Healthcare Research', 'Drug Development', 'Clinical Trials', 'Patient Care'],
    companyDescription: 'Healthcare-focused biotechnology company developing innovative treatments.',
    logo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=100&h=100&fit=crop&crop=center',
    heroImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&h=400&fit=crop'
  },
  {
    id: 'biotech-doom', name: 'Doom Labs', category: 'biotech',
    description: 'Advanced biotechnology research',
    amenities: ['Advanced Research', 'AI Integration', 'Automation', 'Innovation'],
    companyDescription: 'Pioneering advanced biotechnology research with AI integration.',
    logo: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=100&h=100&fit=crop&crop=center',
    heroImage: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=400&fit=crop'
  },
  {
    id: 'biotech-unreal', name: 'Unreal Biotech', category: 'biotech',
    description: 'Virtual reality in biotechnology',
    amenities: ['VR Research', '3D Modeling', 'Simulation', 'Training'],
    companyDescription: 'Revolutionary biotechnology research using virtual reality technology.',
    logo: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=100&h=100&fit=crop&crop=center',
    heroImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=400&fit=crop'
  },
  {
    id: 'biotech-black-mesa', name: 'Black Mesa Research', category: 'biotech',
    description: 'Experimental biotechnology research',
    amenities: ['Experimental Research', 'Advanced Labs', 'Innovation', 'Breakthrough Science'],
    companyDescription: 'Experimental biotechnology research facility pushing scientific boundaries.',
    logo: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=100&h=100&fit=crop&crop=center',
    heroImage: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=400&fit=crop'
  },

  // Hardware District - Individual Companies
  {
    id: 'hardware-waymo', name: 'Waymo Hardware', category: 'hardware',
    description: 'Autonomous vehicle hardware solutions',
    amenities: ['Sensor Systems', 'AI Hardware', 'Vehicle Integration', 'Testing'],
    companyDescription: 'Leading autonomous vehicle hardware and sensor technology.'
  },
  {
    id: 'hardware-golem', name: 'Golem Network', category: 'hardware',
    description: 'Decentralized computing network',
    amenities: ['Computing Power', 'Distributed Network', 'Rendering', 'AI Training'],
    companyDescription: 'Decentralized computing network for distributed processing power.'
  },
  {
    id: 'hardware-tesla', name: 'Tesla Hardware', category: 'hardware',
    description: 'Electric vehicle and energy hardware',
    amenities: ['EV Hardware', 'Battery Technology', 'Solar Panels', 'Energy Storage'],
    companyDescription: 'Innovative hardware solutions for electric vehicles and renewable energy.'
  },
  {
    id: 'hardware-ocean', name: 'Ocean Protocol', category: 'hardware',
    description: 'Data hardware and infrastructure',
    amenities: ['Data Hardware', 'IoT Devices', 'Blockchain Integration', 'Data Markets'],
    companyDescription: 'Hardware infrastructure for decentralized data markets and IoT.'
  },
  {
    id: 'hardware-render', name: 'Render Network', category: 'hardware',
    description: 'Decentralized rendering hardware',
    amenities: ['GPU Rendering', 'Distributed Computing', '3D Graphics', 'Animation'],
    companyDescription: 'Decentralized GPU rendering network for 3D graphics and animation.'
  },
  {
    id: 'hardware-akash', name: 'Akash Network', category: 'hardware',
    description: 'Decentralized cloud computing hardware',
    amenities: ['Cloud Computing', 'Server Infrastructure', 'Deployment', 'Scaling'],
    companyDescription: 'Decentralized cloud computing platform with global server infrastructure.'
  },
  {
    id: 'hardware-helium-iot', name: 'Helium IoT', category: 'hardware',
    description: 'IoT hardware and network infrastructure',
    amenities: ['IoT Devices', 'Network Infrastructure', 'LoRaWAN', 'Mining'],
    companyDescription: 'Decentralized IoT network with hardware mining and connectivity.'
  },
  { 
    id: 'hardware-bittensor', name: 'Bittensor Hardware', category: 'hardware',
    description: 'AI and machine learning hardware',
    amenities: ['AI Hardware', 'Machine Learning', 'Neural Networks', 'Computing'],
    companyDescription: 'Specialized hardware for AI and machine learning applications.'
  },

  // Swag Store
  { 
    id: 'swag-1', name: 'Ethereum Store', category: 'swag',
    description: 'Official Ethereum merchandise and collectibles',
    amenities: ['Limited Editions', 'NFT Collectibles', 'Apparel', 'Accessories'],
    companyDescription: 'The official Ethereum merchandise store featuring exclusive items.'
  },

  // Art Exhibition
  { 
    id: 'art-exhibition', name: 'Artist Collective Gallery', category: 'art', 
    description: 'Curated digital art and NFT exhibitions', 
    amenities: ['NFT Displays', 'Artist Talks', 'Digital Art', 'Collector Meetups'],
    companyDescription: 'Discover beautiful works by emerging artists from Argentina and around the world.'
  },

  // Toilets
  { 
    id: 'toilet-mf-1', name: 'Main Facilities', category: 'toilets',
    description: 'Primary restroom facilities',
    amenities: ['Accessibility Compliant', 'Baby Changing', 'Hand Sanitizer', 'Contactless Features'],
    companyDescription: 'Modern, accessible restroom facilities with contactless technology.'
  },
  {
    id: 'toilet-dis-1', name: 'Accessible Facilities', category: 'toilets',
    description: 'Fully accessible restroom facilities',
    amenities: ['Wheelchair Accessible', 'Special Needs Support', 'Emergency Call System'],
    companyDescription: 'Specially designed accessible facilities ensuring comfort and independence.'
  },

  // Entrances
  { 
    id: 'entrance-1', name: 'West Entrance', category: 'entrance', 
    description: 'Main venue entrance and reception area', 
    amenities: ['Information Desk', 'Security Check', 'Welcome Area', 'Directions'],
    companyDescription: 'Primary entrance to the venue with information services and visitor assistance.'
  },
  { 
    id: 'entrance-2', name: 'East Entrance', category: 'entrance', 
    description: 'Alternative venue entrance', 
    amenities: ['Information Desk', 'Security Check', 'Welcome Area', 'Directions'],
    companyDescription: 'Secondary entrance to the venue with information services and visitor assistance.'
  },
  { 
    id: 'entrance-3', name: 'North Entrance', category: 'entrance', 
    description: 'Side venue entrance', 
    amenities: ['Information Desk', 'Security Check', 'Welcome Area', 'Directions'],
    companyDescription: 'Additional entrance to the venue with information services and visitor assistance.'
  }
]
