// import { Event } from "./model";

// export const dummyEvents: Event[] = [
//   {
//     id: "event-000",
//     name: "Ethereum World's Fair & Coworking Space",
//     isFairEvent: true,
//     description:
//       "Open coworking space for developers, builders, and researchers to collaborate throughout the week.",
//     organizer: "DevConnect",
//     difficulty: "Beginner",
//     location: {
//       url: "https://example.com/coworking",
//       text: "Innovation Hub",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-17T09:00:00Z",
//         end: "2025-11-17T10:00:00Z",
//         name: "Opening Ceremony",
//         location: "Azul Pavillion",
//       },
//       {
//         start: "2025-11-17T10:00:00Z",
//         end: "2025-11-17T18:00:00Z",
//         name: "Hackathon",
//         location: "Azul Pavillion",
//       },
//       {
//         start: "2025-11-17T09:00:00Z",
//         end: "2025-11-17T15:00:00Z",
//         name: "Talks",
//         location: "Amarillo Pavillion",
//       },
//       {
//         start: "2025-11-18T09:00:00Z",
//         end: "2025-11-18T18:00:00Z",
//         name: "Hackathon",
//         location: "Azul Pavillion",
//       },
//       {
//         start: "2025-11-19T09:00:00Z",
//         end: "2025-11-19T18:00:00Z",
//         name: "Hackathon",
//         location: "Azul Pavillion",
//       },
//       {
//         start: "2025-11-20T09:00:00Z",
//         end: "2025-11-20T18:00:00Z",
//         name: "Hackathon",
//         location: "Azul Pavillion",
//       },
//       {
//         start: "2025-11-21T09:00:00Z",
//         end: "2025-11-21T18:00:00Z",
//         name: "Hackathon",
//         location: "Azul Pavillion",
//       },
//       {
//         start: "2025-11-22T09:00:00Z",
//         end: "2025-11-22T18:00:00Z",
//         name: "Hackathon",
//         location: "Azul Pavillion",
//       },
//     ],
//     priority: 1,
//     categories: ["Coworking", "Networking", "Collaboration"],
//   },
//   {
//     id: "event-001",
//     name: "ETH Day",
//     isFairEvent: true,
//     description:
//       "A beginner-friendly workshop covering blockchain fundamentals and use cases.",
//     organizer: "Ethereum Foundation",
//     difficulty: "Beginner",
//     amountPeople: "50",
//     location: {
//       url: "https://example.com/venue1",
//       text: "Main Conference Hall",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-17T10:00:00Z",
//         end: "2025-11-17T12:00:00Z",
//       },
//     ],
//     priority: 1,
//     categories: ["Education", "Blockchain", "Workshop"],
//   },
//   {
//     id: "event-002",
//     name: "Advanced Smart Contract Development",
//     description:
//       "Deep dive into secure smart contract patterns and optimization techniques.",
//     organizer: "Solidity Experts",
//     difficulty: "Advanced",
//     amountPeople: "30",
//     location: {
//       url: "https://example.com/venue2",
//       text: "Developer Lab",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-16T14:00:00Z",
//         end: "2025-11-16T17:00:00Z",
//       },
//     ],
//     priority: 2,
//     categories: ["Development", "Smart Contracts", "Security"],
//   },
//   // {
//   //   id: "event-003",
//   //   name: "DeFi Panel Discussion",
//   //   description: "Industry leaders discuss the future of decentralized finance and emerging trends.",
//   //   organizer: "DeFi Alliance",
//   //   difficulty: "Intermediate",
//   //   lemonadeID: "lemonade-003",
//   //   amountPeople: "100",
//   //   location: {
//   //     url: "https://example.com/venue3",
//   //     text: "Grand Ballroom"
//   //   },
//   //   timeblocks: [
//   //     {
//   //       start: "2025-11-17T13:00:00Z",
//   //       end: "2025-11-17T15:00:00Z"
//   //     }
//   //   ],
//   //   priority: 3,
//   //   categories: ["DeFi", "Panel", "Finance"]
//   // },
//   {
//     id: "event-004",
//     name: "Web3 UX Design Workshop",
//     description:
//       "Learn how to create user-friendly interfaces for decentralized applications.",
//     organizer: "Design DAO",
//     difficulty: "Intermediate",
//     amountPeople: "40",
//     location: {
//       url: "https://example.com/venue4",
//       text: "Design Studio",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-18T09:00:00Z",
//         end: "2025-11-18T12:00:00Z",
//       },
//     ],
//     priority: 2,
//     categories: ["Design", "UX", "Workshop"],
//   },
//   {
//     id: "event-005",
//     name: "Networking Mixer",
//     description:
//       "Connect with developers, investors, and entrepreneurs in the blockchain space.",
//     organizer: "DevConnect",
//     difficulty: "Beginner",
//     amountPeople: "150",
//     location: {
//       url: "https://example.com/venue5",
//       text: "Rooftop Lounge",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-18T18:00:00Z",
//         end: "2025-11-18T21:00:00Z",
//       },
//     ],
//     priority: 1,
//     categories: ["Networking", "Social"],
//   },
//   {
//     id: "event-006",
//     name: "Multi-day Hackathon",
//     isFairEvent: true,
//     description:
//       "Build innovative blockchain solutions over a three-day hackathon event.",
//     organizer: "ETH Global",
//     difficulty: "Intermediate",
//     amountPeople: "200",
//     location: {
//       url: "https://example.com/venue6",
//       text: "Innovation Center",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-19T09:00:00Z",
//         end: "2025-11-19T20:00:00Z",
//       },
//       {
//         start: "2025-11-20T09:00:00Z",
//         end: "2025-11-20T20:00:00Z",
//       },
//       {
//         start: "2025-11-21T09:00:00Z",
//         end: "2025-11-21T18:00:00Z",
//       },
//     ],
//     priority: 1,
//     categories: ["Hackathon", "Development", "Competition"],
//   },
//   {
//     id: "event-007",
//     name: "Zero Knowledge Proofs Workshop",
//     description:
//       "Explore the fundamentals of ZK proofs and their applications in blockchain privacy.",
//     organizer: "ZK Research Group",
//     difficulty: "Advanced",
//     amountPeople: "45",
//     location: {
//       url: "https://example.com/venue7",
//       text: "Tech Pavilion",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-15T13:00:00Z",
//         end: "2025-11-15T16:00:00Z",
//       },
//     ],
//     priority: 2,
//     categories: ["Privacy", "ZK Proofs", "Workshop"],
//   },
//   {
//     id: "event-008",
//     name: "Sustainable Blockchain Summit",
//     description:
//       "Discussion on environmental impacts and solutions for blockchain technologies.",
//     organizer: "Green Blockchain Alliance",
//     difficulty: "Beginner",
//     amountPeople: "120",
//     location: {
//       url: "https://example.com/venue8",
//       text: "Eco Conference Center",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-16T10:00:00Z",
//         end: "2025-11-16T15:00:00Z",
//       },
//     ],
//     priority: 1,
//     categories: ["Sustainability", "Environment", "Conference"],
//   },
//   // {
//   //   id: "event-009",
//   //   name: "Layer 2 Solutions Showcase",
//   //   description: "Demonstrations of leading Layer 2 scaling solutions for Ethereum.",
//   //   organizer: "Scaling Consortium",
//   //   difficulty: "Intermediate",
//   //   lemonadeID: "lemonade-009",
//   //   amountPeople: "80",
//   //   location: {
//   //     url: "https://example.com/venue9",
//   //     text: "Exhibition Hall B"
//   //   },
//   //   timeblocks: [
//   //     {
//   //       start: "2025-11-17T11:00:00Z",
//   //       end: "2025-11-17T16:00:00Z"
//   //     }
//   //   ],
//   //   priority: 2,
//   //   categories: ["Scaling", "Layer 2", "Demo"]
//   // },
//   {
//     id: "event-010",
//     name: "Blockchain Governance Forum",
//     isFairEvent: true,
//     description:
//       "Exploring different governance models in blockchain projects and DAOs.",
//     organizer: "Governance Guild",
//     difficulty: "Advanced",
//     amountPeople: "65",
//     location: {
//       url: "https://example.com/venue10",
//       text: "Forum Auditorium",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-18T14:00:00Z",
//         end: "2025-11-18T17:30:00Z",
//       },
//     ],
//     priority: 3,
//     categories: ["Governance", "DAO", "Policy"],
//   },
//   {
//     id: "event-011",
//     name: "NFT Art Exhibition",
//     isFairEvent: true,
//     description:
//       "Showcase of digital art and NFT collections from renowned crypto artists.",
//     organizer: "CryptoArt Collective",
//     difficulty: "Beginner",
//     amountPeople: "200",
//     location: {
//       url: "https://example.com/venue11",
//       text: "Digital Gallery",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-19T12:00:00Z",
//         end: "2025-11-19T20:00:00Z",
//       },
//       {
//         start: "2025-11-20T12:00:00Z",
//         end: "2025-11-20T20:00:00Z",
//       },
//     ],
//     priority: 1,
//     categories: ["NFT", "Art", "Exhibition"],
//   },
//   {
//     id: "event-012",
//     name: "Cross-chain Interoperability Panel",
//     description:
//       "Technical discussion on bridging protocols and cross-chain communication standards.",
//     organizer: "Interop Alliance",
//     difficulty: "Advanced",
//     amountPeople: "70",
//     location: {
//       url: "https://example.com/venue12",
//       text: "Technical Theater",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-20T15:00:00Z",
//         end: "2025-11-20T17:00:00Z",
//       },
//     ],
//     priority: 3,
//     categories: ["Interoperability", "Cross-chain", "Panel"],
//   },
//   {
//     id: "event-013",
//     name: "DeSci Conference",
//     description:
//       "Exploring decentralized science initiatives and blockchain for research funding.",
//     organizer: "DeSci Foundation",
//     difficulty: "Intermediate",
//     amountPeople: "90",
//     location: {
//       url: "https://example.com/venue13",
//       text: "Science Center",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-21T09:30:00Z",
//         end: "2025-11-21T16:30:00Z",
//       },
//     ],
//     priority: 2,
//     categories: ["DeSci", "Research", "Conference"],
//   },
//   {
//     id: "event-014",
//     name: "Crypto Gaming Tournament",
//     description:
//       "Competitive tournament featuring popular blockchain games with prizes in crypto.",
//     organizer: "GameFi League",
//     difficulty: "Beginner",
//     amountPeople: "150",
//     location: {
//       url: "https://example.com/venue14",
//       text: "Gaming Arena",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-22T10:00:00Z",
//         end: "2025-11-22T18:00:00Z",
//       },
//     ],
//     priority: 1,
//     categories: ["Gaming", "GameFi", "Tournament"],
//   },
//   {
//     id: "event-015",
//     name: "Closing Ceremony & Future of Web3",
//     description:
//       "Keynote speeches on the future direction of Web3 and closing celebrations.",
//     organizer: "DevConnect",
//     difficulty: "Beginner",
//     amountPeople: "300",
//     location: {
//       url: "https://example.com/venue15",
//       text: "Grand Hall",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-23T16:00:00Z",
//         end: "2025-11-23T20:00:00Z",
//       },
//     ],
//     priority: 1,
//     categories: ["Keynote", "Networking", "Celebration"],
//   },
//   {
//     id: "event-016",
//     name: "MEV Workshop & Discussion",
//     description:
//       "Deep dive into Maximal Extractable Value, its implications, and potential solutions.",
//     organizer: "MEV Research Collective",
//     difficulty: "Advanced",
//     amountPeople: "75",
//     location: {
//       url: "https://example.com/venue16",
//       text: "Research Hub",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-19T14:00:00Z",
//         end: "2025-11-19T17:00:00Z",
//       },
//     ],
//     priority: 2,
//     categories: ["MEV", "Research", "Technical"],
//   },
//   {
//     id: "event-017",
//     name: "Web3 Career Fair",
//     description:
//       "Connect with leading blockchain companies and explore career opportunities in Web3.",
//     organizer: "Crypto Careers Network",
//     difficulty: "Beginner",
//     amountPeople: "400",
//     location: {
//       url: "https://example.com/venue17",
//       text: "Career Expo Center",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-20T10:00:00Z",
//         end: "2025-11-20T16:00:00Z",
//       },
//     ],
//     priority: 1,
//     categories: ["Career", "Networking", "Recruitment"],
//   },
//   {
//     id: "event-018",
//     name: "Ethereum Security Workshop",
//     description:
//       "Hands-on workshop focusing on smart contract auditing and security best practices.",
//     organizer: "Security DAO",
//     difficulty: "Advanced",
//     amountPeople: "60",
//     location: {
//       url: "https://example.com/venue18",
//       text: "Security Lab",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-21T13:00:00Z",
//         end: "2025-11-21T17:00:00Z",
//       },
//     ],
//     priority: 2,
//     categories: ["Security", "Smart Contracts", "Workshop"],
//   },
//   {
//     id: "event-019",
//     name: "Crypto Economics Symposium",
//     description:
//       "Academic conference exploring tokenomics, mechanism design, and economic models in crypto.",
//     organizer: "Crypto Economics Lab",
//     difficulty: "Intermediate",
//     amountPeople: "120",
//     location: {
//       url: "https://example.com/venue19",
//       text: "Economics Building",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-22T09:00:00Z",
//         end: "2025-11-22T15:00:00Z",
//       },
//     ],
//     priority: 2,
//     categories: ["Economics", "Research", "Academic"],
//   },
//   {
//     id: "event-020",
//     name: "Ethereum Identity Systems Workshop",
//     description:
//       "Exploring decentralized identity solutions and their implementation on Ethereum.",
//     organizer: "Identity Working Group",
//     difficulty: "Intermediate",
//     amountPeople: "80",
//     location: {
//       url: "https://example.com/venue20",
//       text: "Workshop Room A",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-19T10:00:00Z",
//         end: "2025-11-19T13:00:00Z",
//       },
//     ],
//     priority: 2,
//     categories: ["Identity", "Privacy", "Technical"],
//   },
//   {
//     id: "event-021",
//     name: "Blockchain for Social Impact",
//     description:
//       "Case studies and discussions on using blockchain technology for social good.",
//     organizer: "Impact DAO",
//     difficulty: "Beginner",
//     amountPeople: "150",
//     location: {
//       url: "https://example.com/venue21",
//       text: "Community Hall",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-20T13:00:00Z",
//         end: "2025-11-20T17:00:00Z",
//       },
//     ],
//     priority: 1,
//     categories: ["Social Impact", "Case Studies", "Community"],
//   },
//   {
//     id: "event-022",
//     name: "Rollup Development Workshop",
//     description:
//       "Technical deep dive into building and optimizing rollup solutions.",
//     organizer: "Scaling Solutions Lab",
//     difficulty: "Advanced",
//     amountPeople: "50",
//     location: {
//       url: "https://example.com/venue22",
//       text: "Tech Lab 2",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-21T10:00:00Z",
//         end: "2025-11-21T16:00:00Z",
//       },
//     ],
//     priority: 3,
//     categories: ["Layer 2", "Scaling", "Development"],
//   },
//   {
//     id: "event-023",
//     name: "Web3 Legal Summit",
//     description:
//       "Legal experts discuss regulatory frameworks and compliance in crypto.",
//     organizer: "Blockchain Law Association",
//     difficulty: "Intermediate",
//     amountPeople: "180",
//     location: {
//       url: "https://example.com/venue23",
//       text: "Legal Forum",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-22T09:00:00Z",
//         end: "2025-11-22T17:00:00Z",
//       },
//     ],
//     priority: 2,
//     categories: ["Legal", "Regulation", "Compliance"],
//   },
//   {
//     id: "event-024",
//     name: "DeFi Risk Management",
//     description:
//       "Understanding and mitigating risks in decentralized finance protocols.",
//     organizer: "DeFi Risk DAO",
//     difficulty: "Advanced",
//     amountPeople: "70",
//     location: {
//       url: "https://example.com/venue24",
//       text: "Finance Center",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-19T15:00:00Z",
//         end: "2025-11-19T18:00:00Z",
//       },
//     ],
//     priority: 2,
//     categories: ["DeFi", "Risk Management", "Finance"],
//   },
//   {
//     id: "event-025",
//     name: "Ethereum Data Analytics",
//     description:
//       "Tools and techniques for analyzing on-chain data and market trends.",
//     organizer: "Blockchain Analytics Group",
//     difficulty: "Intermediate",
//     amountPeople: "90",
//     location: {
//       url: "https://example.com/venue25",
//       text: "Data Lab",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-20T09:00:00Z",
//         end: "2025-11-20T13:00:00Z",
//       },
//     ],
//     priority: 2,
//     categories: ["Analytics", "Data Science", "Research"],
//   },
//   {
//     id: "event-026",
//     name: "Web3 Content Creation Workshop",
//     description:
//       "Learn effective strategies for creating educational crypto content.",
//     organizer: "Crypto Education Network",
//     difficulty: "Beginner",
//     amountPeople: "100",
//     location: {
//       url: "https://example.com/venue26",
//       text: "Media Center",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-21T14:00:00Z",
//         end: "2025-11-21T17:00:00Z",
//       },
//     ],
//     priority: 1,
//     categories: ["Education", "Content", "Media"],
//   },
//   {
//     id: "event-027",
//     name: "Decentralized Storage Summit",
//     description:
//       "Exploring innovations in decentralized storage solutions and IPFS.",
//     organizer: "Storage Protocol Alliance",
//     difficulty: "Intermediate",
//     amountPeople: "85",
//     location: {
//       url: "https://example.com/venue27",
//       text: "Protocol Hub",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-22T11:00:00Z",
//         end: "2025-11-22T16:00:00Z",
//       },
//     ],
//     priority: 2,
//     categories: ["Storage", "Infrastructure", "Technical"],
//   },
//   {
//     id: "event-028",
//     name: "Crypto UX Research Symposium",
//     description:
//       "Share and discuss latest research in blockchain user experience design.",
//     organizer: "UX Research Collective",
//     difficulty: "Intermediate",
//     amountPeople: "60",
//     location: {
//       url: "https://example.com/venue28",
//       text: "Design Center",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-19T09:00:00Z",
//         end: "2025-11-19T12:00:00Z",
//       },
//     ],
//     priority: 2,
//     categories: ["UX", "Research", "Design"],
//   },
//   {
//     id: "event-029",
//     name: "Smart Contract Testing Workshop",
//     description:
//       "Hands-on session on testing frameworks and best practices for smart contracts.",
//     organizer: "Testing Standards Group",
//     difficulty: "Advanced",
//     amountPeople: "40",
//     location: {
//       url: "https://example.com/venue29",
//       text: "Testing Lab",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-20T14:00:00Z",
//         end: "2025-11-20T18:00:00Z",
//       },
//     ],
//     priority: 2,
//     categories: ["Development", "Testing", "Smart Contracts"],
//   },
//   {
//     id: "event-030",
//     name: "Web3 Startup Pitch Competition",
//     description:
//       "Early-stage blockchain startups compete for funding and mentorship opportunities.",
//     organizer: "Crypto Founders Network",
//     difficulty: "Intermediate",
//     amountPeople: "200",
//     location: {
//       url: "https://example.com/venue30",
//       text: "Startup Arena",
//     },
//     timeblocks: [
//       {
//         start: "2025-11-21T11:00:00Z",
//         end: "2025-11-21T18:00:00Z",
//       },
//     ],
//     priority: 1,
//     categories: ["Startups", "Funding", "Competition"],
//   },
// ];
