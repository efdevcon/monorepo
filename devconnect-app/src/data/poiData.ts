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
  companyDescription?: string
  companies?: string[]
}

export const pois: POI[] = [
  // Coworking Area
  { 
    id: 'coworking-area', name: 'Coworking Area', category: 'cowork', 
    description: 'Flexible workspace for developers, entrepreneurs, and remote workers', 
    capacity: '200+ people', 
    amenities: ['WiFi', 'Power Outlets', 'Printing', 'Meeting Rooms', 'Phone Booths', 'Whiteboards', 'Coffee Station'],
    companyDescription: 'Dedicated space for collaborative or solo work. Find your perfect spot whether you need focused work time, team collaboration, or networking opportunities — open all day.'
  },
  
  // DeFi District
  { 
    id: 'defi-district', name: 'DeFi District', category: 'defi', 
    description: 'Decentralized Finance companies and protocols showcase', 
    currentEvent: 'DeFi Innovation Showcase - All Day', capacity: '400 people',
    amenities: ['Protocol Demos', 'Trading Simulators', 'Developer Workshops', 'Yield Farming'],
    heroImage: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=800&auto=format&fit=crop',
    companyDescription: 'Explore the future of decentralized finance with leading protocols and innovative companies.',
    companies: ['Uniswap Labs', 'Aave Protocol', 'Compound Finance', 'MakerDAO', 'Curve Finance', 'Synthetix Network', '1inch Network', 'Balancer Protocol']
  },
  
  // Biotech District
  { 
    id: 'biotech-district', name: 'Biotech District', category: 'biotech', 
    description: 'Blockchain and biotechnology innovation showcase', 
    currentEvent: 'BioTech Innovation Summit - All Day', capacity: '320 people', 
    amenities: ['DNA Sequencing', 'Medical Research', 'Health Data Privacy', 'Clinical Trials'],
    heroImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?q=80&w=800&auto=format&fit=crop',
    companyDescription: 'Discover the intersection of blockchain and biotechnology with leading research organizations and healthcare innovators.',
    companies: ['GenomicsDAO', 'HealthBlocks', 'PharmaChain', 'BioLedger', 'MedToken', 'LifeDAO', 'DNAVault', 'BioMarket']
  },
  
  // Hardware District
  { 
    id: 'hardware-district', name: 'Hardware District', category: 'hardware', 
    description: 'Blockchain hardware and infrastructure showcase', 
    currentEvent: 'Hardware Innovation Expo - All Day', capacity: '200 people', 
    amenities: ['Hardware Wallets', 'IoT Devices', 'Mining Equipment', 'Security Solutions'],
    heroImage: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80',
    companyDescription: 'Experience cutting-edge blockchain hardware and infrastructure solutions from industry leaders.',
    companies: ['Helium Network', 'Filecoin Station', 'Raspberry Pi Foundation', 'Ledger', 'Trezor', 'GridPlus', 'Oasis Labs', 'Ethereum Foundation']
  },
  
  // Social District
  { 
    id: 'social-district', name: 'Social District', category: 'social', 
    description: 'Social media and community platforms on blockchain', 
    currentEvent: 'Web3 Social Summit - All Day', capacity: '300 people', 
    amenities: ['Social Platforms', 'Creator Tools', 'Community Governance', 'Content Monetization'],
    heroImage: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?q=80&w=800&auto=format&fit=crop',
    companyDescription: 'Explore the future of decentralized social media and community-driven platforms.',
    companies: ['Lens Protocol', 'Farcaster', 'Mirror', 'Rally', 'Audius', 'BitClout', 'Steemit', 'Minds']
  },
  
  // Coffee Stations
  { 
    id: 'coffee-stations', name: 'Coffee Station', category: 'coffee', 
    description: 'Premium coffee and refreshments throughout the venue', 
    capacity: 'Multiple locations', 
    amenities: ['Espresso', 'Cold Brew', 'Tea Selection', 'Pastries', 'Energy Drinks', 'Crypto Payments'],
    companyDescription: 'One of many delicious coffee stations located throughout the venue, serving premium caffeinated beverages and light snacks. Perfect for networking breaks and staying energized during the event.'
  },
  
  // Food & Beverage
  { 
    id: 'fnb-1', name: 'Asado Express', category: 'fnb', 
    description: 'Traditional Argentine grilled meats and empanadas', 
    amenities: ['Asado BBQ', 'Fresh Empanadas', 'Chimichurri', 'Choripán'],
    companyDescription: 'Authentic Argentine asado experience featuring premium grilled meats, homemade empanadas, and traditional chimichurri sauce.'
  },
  { 
    id: 'fnb-2', name: 'Porteño Bites', category: 'fnb', 
    description: 'Buenos Aires street food and milanesas', 
    amenities: ['Milanesas', 'Provoleta', 'Medialunas', 'Mate Tea'],
    companyDescription: 'Classic Buenos Aires comfort food including crispy milanesas, grilled provoleta cheese, and fresh medialunas with authentic mate tea.'
  },
  { 
    id: 'fnb-3', name: 'Dulce & Salado', category: 'fnb', 
    description: 'Argentine pastries and alfajores', 
    amenities: ['Alfajores', 'Facturas', 'Dulce de Leche', 'Cortado Coffee'],
    companyDescription: 'Traditional Argentine bakery specializing in alfajores, fresh facturas, and artisanal dulce de leche treats paired with perfect cortado coffee.'
  },
  { 
    id: 'fnb-4', name: 'Tokyo Ramen Bar', category: 'fnb', 
    description: 'Authentic Japanese ramen and gyoza', 
    amenities: ['Tonkotsu Ramen', 'Miso Ramen', 'Gyoza', 'Japanese Beer'],
    companyDescription: 'Authentic Japanese ramen experience with rich tonkotsu and miso broths, handmade gyoza, and imported Japanese beverages.'
  },
  
  // Toilets
  { 
    id: 'toilet-mf', name: 'Main Facilities', category: 'toilets', 
    description: 'Primary restroom facilities', 
    amenities: ['Accessibility Compliant', 'Baby Changing', 'Hand Sanitizer', 'Contactless Features'],
    companyDescription: 'Modern, accessible restroom facilities with contactless technology and sustainability features.'
  },
  { 
    id: 'toilet-dis', name: 'Accessible Facilities', category: 'toilets', 
    description: 'Fully accessible restroom facilities', 
    amenities: ['Wheelchair Accessible', 'Special Needs Support', 'Emergency Call System'],
    companyDescription: 'Specially designed accessible facilities ensuring comfort and independence for all users.'
  },
  
  // Other areas
  { 
    id: 'art-exhibit-1', name: 'Artist Collective Gallery', category: 'art-exhbition', 
    description: 'Curated digital art and NFT exhibitions', 
    amenities: ['NFT Displays', 'Artist Talks', 'Digital Art', 'Collector Meetups'],
    companyDescription: 'Discover beautiful works by emerging artists from Argentina and around the world.'
  },
  { 
    id: 'swag', name: 'Ethereum Store', category: 'swag', 
    description: 'Official Ethereum merchandise and collectibles', 
    amenities: ['Limited Editions', 'NFT Collectibles', 'Apparel', 'Accessories'],
    companyDescription: 'The official Ethereum merchandise store featuring exclusive items and limited edition collectibles.'
  },
  
  // Entrances
  { 
    id: 'entrance-north', name: 'North Entrance', category: 'entrance', 
    description: 'Main venue entrance and reception area', 
    amenities: ['Information Desk', 'Security Check', 'Welcome Area', 'Directions'],
    companyDescription: 'Primary entrance to the venue with information services and visitor assistance.'
  },
  { 
    id: 'entrance-west', name: 'West Entrance', category: 'entrance', 
    description: 'Alternative venue entrance', 
    amenities: ['Information Desk', 'Security Check', 'Welcome Area', 'Directions'],
    companyDescription: 'Secondary entrance to the venue with information services and visitor assistance.'
  },
  { 
    id: 'entrance-east', name: 'East Entrance', category: 'entrance', 
    description: 'Side venue entrance', 
    amenities: ['Information Desk', 'Security Check', 'Welcome Area', 'Directions'],
    companyDescription: 'Additional entrance to the venue with information services and visitor assistance.'
  }
]
