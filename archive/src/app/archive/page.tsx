import { Suspense } from "react";
import {
  HydrationBoundary,
  dehydrate,
  QueryClient,
} from "@tanstack/react-query";
import { prefetchArchiveData } from "@/hooks/useArchiveData";
import { ArchiveList } from "@/components/archive/ArchiveList";
import { ArchiveSearch } from "@/components/archive/ArchiveSearch";

// This runs on the server at build time or on-demand in dev
export async function generateMetadata() {
  // You can fetch any data needed for metadata here
  return {
    title: "Archive",
  };
}

export default async function ArchivePage() {
  const queryClient = new QueryClient();

  // Prefetch the initial data
  await prefetchArchiveData(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div>
        <h1>Archive</h1>
        <Suspense fallback={<div>Loading search...</div>}>
          <ArchiveSearch />
        </Suspense>
        <Suspense fallback={<div>Loading archive...</div>}>
          <ArchiveList />
        </Suspense>
      </div>
    </HydrationBoundary>
  );
}
