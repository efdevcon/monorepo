import type { QuestGroup } from '@/types';

export const questGroupsData: QuestGroup[] = [
  {
    id: 1,
    name: "Setup & app tour",
    description: "Set off on your World's Fair journey with quests to help you set up and learn the event app.",
    image: "/images/quest-setup-app-tour.png"
  },
  {
    id: 4,
    name: "App Showcase",
    description: "Explore the latest Ethereum applications by visiting brand booths and pavilions across eight cutting-edge sectors.",
    image: "/images/quest-app-showcase.png"
  },
  {
    id: 2,
    name: "Crypto payment",
    description: "Pay with crypto at participating merchants.",
    image: "/images/quest-worlds-fair-interactions.png"
  },
  {
    id: 3,
    name: "Community Quests",
    description: "Complete more quests from the community.",
    image: "/images/quest-worlds-fair-interactions.png"
  }
];
