export interface Event {
  id: string;
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
  priority: number;
  event_type: string | any;
  categories: string[];
}
