export interface Event {
  id: string;
  name: string;
  isFairEvent?: boolean;
  isCoreEvent?: boolean;
  description: string;
  organizer: string;
  difficulty: string;
  amountPeople?: string;
  spanRows?: number;
  onClick?: () => void;
  location: {
    url: string;
    text: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  timeblocks: {
    start: string;
    end: string;
    name?: string;
    location?: string;
  }[];
  priority: number;
  categories: string[];
}
