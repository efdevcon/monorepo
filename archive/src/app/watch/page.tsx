import { PageHero } from "@/components/common/page-hero";
import { Watch } from "@/components/domain/archive";

export default function Index() {
  return (
    <div className="">
      <PageHero
        title="Watch"
        // titleSubtext="Devcon"
        description="Devcon content curated and organized for your discovery and learning."
      />
      <Watch />
    </div>
  );
}
