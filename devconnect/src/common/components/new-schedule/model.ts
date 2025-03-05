export interface Event {
  id: string;
  name: string;
  description: string;
  organizer: string;
  difficulty: string;
  lemonadeID: string;
  amountPeople: string;
  location: {
    url: string;
    text: string;
  };
  timeblocks: {
    start: string;
    end: string;
  }[];
  priority: number;
  categories: string[];
}
