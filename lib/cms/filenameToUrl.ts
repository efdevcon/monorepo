/*
  Maps devcon.org pages to a url - used by tina configuration and by openai integration
*/

export const filenameToUrl = {
  index: "/",
  dips: "/dips",
  past_events: "/past-events",
  road_to_devcon: "/road-to-devcon",
  faq: "/faq",
  programming: "/programming",
  tickets: "/tickets",
  about: "/about",
  supporters: "/supporters",
  speaker_applications: "/speaker-applications",
  city_guide: "/city-guide",
  devcon_week: "/devcon-week",
  sea_local: "/sea-local",
  experiences: "/experiences",
} as { [key: string]: string };
