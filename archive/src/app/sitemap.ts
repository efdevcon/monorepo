import { getEvents, getSessions } from "@/services/devcon";
import { SITE_URL } from "@/utils/site";
import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = await getEvents();
  const sessions = await getSessions(5000); // get all sessions, without pagination

  const pages = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/watch`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.8,
    },
    ...events.map((event: any) => ({
      url: `${SITE_URL}/${event.id}`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.7,
    })),
    ...sessions.map((session: any) => ({
      url: `${SITE_URL}/${session.eventId}/${session.id}`,
      lastModified: new Date(),
      changeFrequency: "never",
      priority: 0.6,
    })),
  ] as MetadataRoute.Sitemap;

  return pages;
}
