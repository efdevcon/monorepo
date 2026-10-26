import { Coffee, DoorOpen, Gamepad2, Laptop, MapPin, Mic, Store, Ticket, Toilet, Users, type LucideIcon } from "lucide-react";

/**
 * The Find categories, in list order. The only place that maps a category to
 * a lucide glyph. `legend` puts one swatch chip for the whole category into
 * the open floor's legend (the chip takes the fill most of its footprints
 * use); categories whose places explain themselves have none.
 */
export const CATEGORIES = [
  { id: "stages", label: "Stages", Icon: Mic, legend: "Stages" },
  { id: "suites", label: "Suites", Icon: DoorOpen, legend: "Suites" },
  { id: "hubs", label: "Community", Icon: Users, legend: "Community" },
  { id: "supporters", label: "Supporters", Icon: Store, legend: "Supporters" },
  { id: "food", label: "Food & drink", Icon: Coffee, legend: null },
  { id: "toilets", label: "Washrooms", Icon: Toilet, legend: null },
  { id: "cowork", label: "Cowork & discussion", Icon: Laptop, legend: "Work & Rest" },
  { id: "checkin", label: "Check-in & swag", Icon: Ticket, legend: "Check-in" },
  { id: "fun", label: "Fun & rest", Icon: Gamepad2, legend: "Fun & Culture" },
  { id: "other", label: "Other", Icon: MapPin, legend: null },
] as const satisfies readonly { id: string; label: string; Icon: LucideIcon; legend: string | null }[];

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export type Category = (typeof CATEGORIES)[number];

export const categoryById = (id: CategoryId): Category => CATEGORIES.find((c) => c.id === id)!;
