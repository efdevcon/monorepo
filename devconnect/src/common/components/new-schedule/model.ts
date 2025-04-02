export interface Event {
  id: string;
  name: string;
  isFairEvent?: boolean;
  isCoreEvent?: boolean;
  description: string;
  organizer: string;
  difficulty: string;
  lemonadeID: string;
  amountPeople?: string;
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
