export interface Event {
  id: string;
  name: string;
  description: string;
  organizer: string;
  difficulty: string;
  lemonadeID: string;
  amountPeople?: string;
  location: {
    url: string;
    text: string;
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
