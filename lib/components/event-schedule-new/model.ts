export interface Event {
  id: string;
  rkey?: string;
  name: string;
  isFairEvent?: boolean;
  isCoreEvent?: boolean;
  description: string;
  organizer: string;
  difficulty: string | any;
  amountPeople?: string;
  spanRows?: number;
  onClick?: () => void;
  location:
    | {
        url: string;
        text: string;
        coordinates?: {
          lat: number;
          lng: number;
        };
      }
    | string;
  timeblocks: {
    start: string;
    end: string;
    name?: string;
    location?: string;
  }[];
  priority?: number;
  eventType: string | any;
  categories: string[];
  eventLink: string;
  imageUrl?: string;
  showTimeOfDay?: boolean;
  ticketsAvailable?: boolean;
  xHandle?: string;
  instagramHandle?: string;
  farcasterHandle?: string;
  ticketsUrl?: string;
  soldOut?: boolean;
}
