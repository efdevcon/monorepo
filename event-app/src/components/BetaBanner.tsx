"use client";

import { useSyncExternalStore } from "react";
import cn from "classnames";
import { FlaskConical } from "lucide-react";
import { DEFAULT_DATASET_KEY, getActiveDatasetKey, type DatasetKey } from "@/data/dataset";

/** The dataset whose content is still in flux; the banner shows on it only. */
const BETA_DATASET: DatasetKey = "devcon8";

const noSubscribe = () => () => {};

// The dataset is fixed per page load (`?dataset=` or the deployment default):
// the server renders the default, the client swaps in the URL's choice after
// hydration without a mismatch.
function useIsBetaDataset(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => getActiveDatasetKey() === BETA_DATASET,
    () => DEFAULT_DATASET_KEY === BETA_DATASET
  );
}

/**
 * "Early Access. Schedule subject to change": the full-bleed blue strip on
 * the Schedule and Speakers lists while the Devcon 8 programme settles. Never
 * sticky; it scrolls away with the page. The caller sets the display class
 * (`hidden lg:flex` under the desktop nav, `flex lg:hidden` under the mobile
 * sticky rows), so one page can place it differently per breakpoint.
 */
export function BetaBanner({ className }: { className?: string }) {
  const beta = useIsBetaDataset();
  if (!beta) return null;
  return (
    <div
      role="note"
      className={cn(
        "items-center justify-center gap-2 bg-[#BFDBFE] px-4 py-2 font-heading text-[14px] leading-5 text-dc-fg2",
        "phone-landscape:pl-[max(16px,var(--safe-left))] phone-landscape:pr-[max(16px,var(--safe-right))]",
        className
      )}
    >
      <FlaskConical className="size-4 shrink-0" aria-hidden />
      <p>
        <b className="font-bold">Early Access</b>. Schedule subject to change
      </p>
    </div>
  );
}
