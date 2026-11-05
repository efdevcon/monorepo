import { getFeaturedSessions } from "@/services/devcon";
import { PageHeroClient } from "./common/page-hero/PageHero";

export async function Hero() {
  // Devcon 8 picks with their own photos lead; the featured recordings, then
  // the Devcon 7 picks, cover the hero while those are not published yet.
  const picks = await getFeaturedSessions("devcon-8-picks");
  const featured = picks?.length ? [] : await getFeaturedSessions("devcon-8");
  const featuredItems = picks?.length
    ? picks
    : featured?.length
      ? featured.slice(0, 5)
      : await getFeaturedSessions("devcon-7-picks");
  if (!featuredItems) return null;

  return <PageHeroClient featuredItems={featuredItems} />;
}
