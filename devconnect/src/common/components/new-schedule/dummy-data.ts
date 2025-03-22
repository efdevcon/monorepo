import { Event } from './model';

export const dummyEvents: Event[] = [
  {
    id: "event-000",
    name: "DevConnect Coworking Space",
    description: "Open coworking space for developers, builders, and researchers to collaborate throughout the week.",
    organizer: "DevConnect",
    difficulty: "Beginner",
    lemonadeID: "lemonade-000",
    amountPeople: "100",
    location: {
      url: "https://example.com/coworking",
      text: "Innovation Hub"
    },
    timeblocks: [
      {
        start: "2025-11-17T09:00:00Z",
        end: "2025-11-17T18:00:00Z"
      },
      {
        start: "2025-11-18T09:00:00Z",
        end: "2025-11-18T18:00:00Z"
      },
      {
        start: "2025-11-19T09:00:00Z",
        end: "2025-11-19T18:00:00Z"
      },
      {
        start: "2025-11-20T09:00:00Z",
        end: "2025-11-20T18:00:00Z"
      },
      {
        start: "2025-11-21T09:00:00Z",
        end: "2025-11-21T18:00:00Z"
      },
      {
        start: "2025-11-22T09:00:00Z",
        end: "2025-11-22T18:00:00Z"
      }
    ],
    priority: 1,
    categories: ["Coworking", "Networking", "Collaboration"]
  },
  {
    id: "event-001",
    name: "ETH Day",
    description: "A beginner-friendly workshop covering blockchain fundamentals and use cases.",
    organizer: "Ethereum Foundation",
    difficulty: "Beginner",
    lemonadeID: "lemonade-001",
    amountPeople: "50",
    location: {
      url: "https://example.com/venue1",
      text: "Main Conference Hall"
    },
    timeblocks: [
      {
        start: "2025-11-17T10:00:00Z",
        end: "2025-11-17T12:00:00Z"
      }
    ],
    priority: 1,
    categories: ["Education", "Blockchain", "Workshop"]
  },
  {
    id: "event-002",
    name: "Advanced Smart Contract Development",
    description: "Deep dive into secure smart contract patterns and optimization techniques.",
    organizer: "Solidity Experts",
    difficulty: "Advanced",
    lemonadeID: "lemonade-002",
    amountPeople: "30",
    location: {
      url: "https://example.com/venue2",
      text: "Developer Lab"
    },
    timeblocks: [
      {
        start: "2025-11-16T14:00:00Z",
        end: "2025-11-16T17:00:00Z"
      }
    ],
    priority: 2,
    categories: ["Development", "Smart Contracts", "Security"]
  },
  // {
  //   id: "event-003",
  //   name: "DeFi Panel Discussion",
  //   description: "Industry leaders discuss the future of decentralized finance and emerging trends.",
  //   organizer: "DeFi Alliance",
  //   difficulty: "Intermediate",
  //   lemonadeID: "lemonade-003",
  //   amountPeople: "100",
  //   location: {
  //     url: "https://example.com/venue3",
  //     text: "Grand Ballroom"
  //   },
  //   timeblocks: [
  //     {
  //       start: "2025-11-17T13:00:00Z",
  //       end: "2025-11-17T15:00:00Z"
  //     }
  //   ],
  //   priority: 3,
  //   categories: ["DeFi", "Panel", "Finance"]
  // },
  {
    id: "event-004",
    name: "Web3 UX Design Workshop",
    description: "Learn how to create user-friendly interfaces for decentralized applications.",
    organizer: "Design DAO",
    difficulty: "Intermediate",
    lemonadeID: "lemonade-004",
    amountPeople: "40",
    location: {
      url: "https://example.com/venue4",
      text: "Design Studio"
    },
    timeblocks: [
      {
        start: "2025-11-18T09:00:00Z",
        end: "2025-11-18T12:00:00Z"
      }
    ],
    priority: 2,
    categories: ["Design", "UX", "Workshop"]
  },
  {
    id: "event-005",
    name: "Networking Mixer",
    description: "Connect with developers, investors, and entrepreneurs in the blockchain space.",
    organizer: "DevConnect",
    difficulty: "Beginner",
    lemonadeID: "lemonade-005",
    amountPeople: "150",
    location: {
      url: "https://example.com/venue5",
      text: "Rooftop Lounge"
    },
    timeblocks: [
      {
        start: "2025-11-18T18:00:00Z",
        end: "2025-11-18T21:00:00Z"
      }
    ],
    priority: 1,
    categories: ["Networking", "Social"]
  },
  {
    id: "event-006",
    name: "Multi-day Hackathon",
    description: "Build innovative blockchain solutions over a three-day hackathon event.",
    organizer: "ETH Global",
    difficulty: "Intermediate",
    lemonadeID: "lemonade-006",
    amountPeople: "200",
    location: {
      url: "https://example.com/venue6",
      text: "Innovation Center"
    },
    timeblocks: [
      {
        start: "2025-11-19T09:00:00Z",
        end: "2025-11-19T20:00:00Z"
      },
      {
        start: "2025-11-20T09:00:00Z",
        end: "2025-11-20T20:00:00Z"
      },
      {
        start: "2025-11-21T09:00:00Z",
        end: "2025-11-21T18:00:00Z"
      }
    ],
    priority: 1,
    categories: ["Hackathon", "Development", "Competition"]
  },
  {
    id: "event-007",
    name: "Zero Knowledge Proofs Workshop",
    description: "Explore the fundamentals of ZK proofs and their applications in blockchain privacy.",
    organizer: "ZK Research Group",
    difficulty: "Advanced",
    lemonadeID: "lemonade-007",
    amountPeople: "45",
    location: {
      url: "https://example.com/venue7",
      text: "Tech Pavilion"
    },
    timeblocks: [
      {
        start: "2025-11-15T13:00:00Z",
        end: "2025-11-15T16:00:00Z"
      }
    ],
    priority: 2,
    categories: ["Privacy", "ZK Proofs", "Workshop"]
  },
  {
    id: "event-008",
    name: "Sustainable Blockchain Summit",
    description: "Discussion on environmental impacts and solutions for blockchain technologies.",
    organizer: "Green Blockchain Alliance",
    difficulty: "Beginner",
    lemonadeID: "lemonade-008",
    amountPeople: "120",
    location: {
      url: "https://example.com/venue8",
      text: "Eco Conference Center"
    },
    timeblocks: [
      {
        start: "2025-11-16T10:00:00Z",
        end: "2025-11-16T15:00:00Z"
      }
    ],
    priority: 1,
    categories: ["Sustainability", "Environment", "Conference"]
  },
  // {
  //   id: "event-009",
  //   name: "Layer 2 Solutions Showcase",
  //   description: "Demonstrations of leading Layer 2 scaling solutions for Ethereum.",
  //   organizer: "Scaling Consortium",
  //   difficulty: "Intermediate",
  //   lemonadeID: "lemonade-009",
  //   amountPeople: "80",
  //   location: {
  //     url: "https://example.com/venue9",
  //     text: "Exhibition Hall B"
  //   },
  //   timeblocks: [
  //     {
  //       start: "2025-11-17T11:00:00Z",
  //       end: "2025-11-17T16:00:00Z"
  //     }
  //   ],
  //   priority: 2,
  //   categories: ["Scaling", "Layer 2", "Demo"]
  // },
  {
    id: "event-010",
    name: "Blockchain Governance Forum",
    description: "Exploring different governance models in blockchain projects and DAOs.",
    organizer: "Governance Guild",
    difficulty: "Advanced",
    lemonadeID: "lemonade-010",
    amountPeople: "65",
    location: {
      url: "https://example.com/venue10",
      text: "Forum Auditorium"
    },
    timeblocks: [
      {
        start: "2025-11-18T14:00:00Z",
        end: "2025-11-18T17:30:00Z"
      }
    ],
    priority: 3,
    categories: ["Governance", "DAO", "Policy"]
  },
  {
    id: "event-011",
    name: "NFT Art Exhibition",
    description: "Showcase of digital art and NFT collections from renowned crypto artists.",
    organizer: "CryptoArt Collective",
    difficulty: "Beginner",
    lemonadeID: "lemonade-011",
    amountPeople: "200",
    location: {
      url: "https://example.com/venue11",
      text: "Digital Gallery"
    },
    timeblocks: [
      {
        start: "2025-11-19T12:00:00Z",
        end: "2025-11-19T20:00:00Z"
      },
      {
        start: "2025-11-20T12:00:00Z",
        end: "2025-11-20T20:00:00Z"
      }
    ],
    priority: 1,
    categories: ["NFT", "Art", "Exhibition"]
  },
  {
    id: "event-012",
    name: "Cross-chain Interoperability Panel",
    description: "Technical discussion on bridging protocols and cross-chain communication standards.",
    organizer: "Interop Alliance",
    difficulty: "Advanced",
    lemonadeID: "lemonade-012",
    amountPeople: "70",
    location: {
      url: "https://example.com/venue12",
      text: "Technical Theater"
    },
    timeblocks: [
      {
        start: "2025-11-20T15:00:00Z",
        end: "2025-11-20T17:00:00Z"
      }
    ],
    priority: 3,
    categories: ["Interoperability", "Cross-chain", "Panel"]
  },
  {
    id: "event-013",
    name: "DeSci Conference",
    description: "Exploring decentralized science initiatives and blockchain for research funding.",
    organizer: "DeSci Foundation",
    difficulty: "Intermediate",
    lemonadeID: "lemonade-013",
    amountPeople: "90",
    location: {
      url: "https://example.com/venue13",
      text: "Science Center"
    },
    timeblocks: [
      {
        start: "2025-11-21T09:30:00Z",
        end: "2025-11-21T16:30:00Z"
      }
    ],
    priority: 2,
    categories: ["DeSci", "Research", "Conference"]
  },
  {
    id: "event-014",
    name: "Crypto Gaming Tournament",
    description: "Competitive tournament featuring popular blockchain games with prizes in crypto.",
    organizer: "GameFi League",
    difficulty: "Beginner",
    lemonadeID: "lemonade-014",
    amountPeople: "150",
    location: {
      url: "https://example.com/venue14",
      text: "Gaming Arena"
    },
    timeblocks: [
      {
        start: "2025-11-22T10:00:00Z",
        end: "2025-11-22T18:00:00Z"
      }
    ],
    priority: 1,
    categories: ["Gaming", "GameFi", "Tournament"]
  },
  {
    id: "event-015",
    name: "Closing Ceremony & Future of Web3",
    description: "Keynote speeches on the future direction of Web3 and closing celebrations.",
    organizer: "DevConnect",
    difficulty: "Beginner",
    lemonadeID: "lemonade-015",
    amountPeople: "300",
    location: {
      url: "https://example.com/venue15",
      text: "Grand Hall"
    },
    timeblocks: [
      {
        start: "2025-11-23T16:00:00Z",
        end: "2025-11-23T20:00:00Z"
      }
    ],
    priority: 1,
    categories: ["Keynote", "Networking", "Celebration"]
  }
]; 