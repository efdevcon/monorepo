import CommunityHubs from "../community-hubs";

/** One Community Hub's embedded schedule, `/community-hubs/<hub id>`. */
export default async function CommunityHubPage({ params }: { params: Promise<{ hub: string }> }) {
  const { hub } = await params;
  return <CommunityHubs hubId={hub} />;
}
