"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpen, RotateCcw } from "lucide-react";

const REPO_URL =
  "https://github.com/efdevcon/monorepo/blob/main/event-app/docs/ticket-proofs.md";

/**
 * Demo affordances that would not exist on a real partner site: a link to how
 * this works, and a reset for the spent-set (which is otherwise write-once, so
 * a ticket can only be demoed once).
 */
export function DemoTools() {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);
  const [cleared, setCleared] = useState<number | null>(null);

  const reset = async () => {
    setResetting(true);
    try {
      const res = await fetch("/api/demo/ens-claim", { method: "DELETE" });
      const json = await res.json();
      setCleared(json?.data?.cleared ?? 0);
      // Re-render the server component so the verdict reflects the empty store.
      router.refresh();
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <a
        href={REPO_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-neutral-700 underline hover:text-neutral-900"
      >
        <BookOpen className="size-3.5" />
        How this works
      </a>
      <button
        type="button"
        onClick={reset}
        disabled={resetting}
        className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-neutral-700 underline hover:text-neutral-900 disabled:opacity-60"
      >
        <RotateCcw className={`size-3.5 ${resetting ? "animate-spin" : ""}`} />
        Reset demo claims
      </button>
      {cleared !== null && (
        <span className="text-[12px] text-neutral-500">
          cleared {cleared} claim{cleared === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}
