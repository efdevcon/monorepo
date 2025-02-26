import { getFeaturedSessions } from "@/services/devcon";
import { PageHeroClient } from "./common/page-hero/PageHero";

export async function Hero() {
  const featuredItems = await getFeaturedSessions();
  if (!featuredItems) return null;

  return <PageHeroClient featuredItems={featuredItems} />;
}
