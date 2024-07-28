import { CONFIG } from "@/utils/config";

export async function getEvents() {
  const response = await fetch(`${CONFIG.API_BASE_URL}/events`);
  const events = await response.json();
  return events.data;
}

export async function getEvent(id: string) {
  const response = await fetch(`${CONFIG.API_BASE_URL}/events/${id}`);
  const event = await response.json();
  return event.data;
}
