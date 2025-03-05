import { Event } from './model';

export const dummyEvents: Event[] = [
  {
    id: "event-001",
    name: "Introduction to Blockchain",
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
        start: "2023-11-15T10:00:00Z",
        end: "2023-11-15T12:00:00Z"
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
        start: "2023-11-16T14:00:00Z",
        end: "2023-11-16T17:00:00Z"
      }
    ],
    priority: 2,
    categories: ["Development", "Smart Contracts", "Security"]
  },
  {
    id: "event-003",
    name: "DeFi Panel Discussion",
    description: "Industry leaders discuss the future of decentralized finance and emerging trends.",
    organizer: "DeFi Alliance",
    difficulty: "Intermediate",
    lemonadeID: "lemonade-003",
    amountPeople: "100",
    location: {
      url: "https://example.com/venue3",
      text: "Grand Ballroom"
    },
    timeblocks: [
      {
        start: "2023-11-17T13:00:00Z",
        end: "2023-11-17T15:00:00Z"
      }
    ],
    priority: 3,
    categories: ["DeFi", "Panel", "Finance"]
  },
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
        start: "2023-11-18T09:00:00Z",
        end: "2023-11-18T12:00:00Z"
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
        start: "2023-11-18T18:00:00Z",
        end: "2023-11-18T21:00:00Z"
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
        start: "2023-11-19T09:00:00Z",
        end: "2023-11-19T20:00:00Z"
      },
      {
        start: "2023-11-20T09:00:00Z",
        end: "2023-11-20T20:00:00Z"
      },
      {
        start: "2023-11-21T09:00:00Z",
        end: "2023-11-21T18:00:00Z"
      }
    ],
    priority: 1,
    categories: ["Hackathon", "Development", "Competition"]
  }
]; 