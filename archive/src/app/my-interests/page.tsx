import { Suspense } from "react";
import type { Metadata } from "next";
import { MyInterests } from "@/components/domain/archive/MyInterests";

export const metadata: Metadata = {
  title: "Your recordings",
  // A personal list built from the link's parameters: nothing to index.
  robots: { index: false, follow: true },
};

export default function Index() {
  return (
    <Suspense fallback={null}>
      <MyInterests />
    </Suspense>
  );
}
