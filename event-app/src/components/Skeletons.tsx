import cn from "classnames";

/**
 * Loading placeholders shaped like the content they stand in for, so the
 * page doesn't jump when data lands. One pulse per skeleton (on the wrapper,
 * not per bone) keeps every bone on the same clock; reduced motion gets a
 * still placeholder. The visible text is sr-only: screen readers hear the
 * same "Loading …" the old text line said.
 */
const bone = "rounded bg-dc-fg2/[0.07]";
const pulse = "motion-safe:animate-pulse";

function Bone({ className }: { className?: string }) {
  return <div aria-hidden className={cn(bone, className)} />;
}

function Status({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" className={cn(pulse, className)}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Session rows: 8px rail on phones, 60px gem rail on desktop (SessionCard). */
function SessionRow({ i }: { i: number }) {
  return (
    <div className="flex gap-4 overflow-clip rounded-lg border border-dc-hairline bg-white">
      <div className="w-2 shrink-0 self-stretch bg-dc-fg2/[0.07] lg:w-[60px]" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 py-4 pr-4">
        <Bone className={cn("h-5", i % 3 === 0 ? "w-[72%]" : i % 3 === 1 ? "w-[55%]" : "w-[64%]")} />
        <div className="flex gap-3">
          <Bone className="h-4 w-20" />
          <Bone className="h-4 w-24" />
          <Bone className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

/** Speaker rows: 48px avatar + name and meta line (SpeakerCard). */
function SpeakerRow({ i }: { i: number }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-dc-hairline bg-white p-4">
      <Bone className="size-12 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Bone className={cn("h-5", i % 2 === 0 ? "w-40" : "w-32")} />
        <Bone className="h-4 w-24" />
      </div>
    </div>
  );
}

export function ListSkeleton({ kind, label, count = 6 }: { kind: "schedule" | "speakers"; label: string; count?: number }) {
  const Row = kind === "schedule" ? SessionRow : SpeakerRow;
  return (
    <Status label={label} className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, i) => (
        <Row key={i} i={i} />
      ))}
    </Status>
  );
}

/** One event-ticket card, same footprint as EventTicketCard. */
export function TicketSkeleton() {
  return (
    <Status label="Loading tickets…" className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      <div className="flex h-[320px] w-full flex-col justify-between rounded-[12px] border border-dc-hairline bg-white p-4 lg:w-[320px] lg:shrink-0">
        <div className="flex flex-col gap-5">
          <Bone className="h-8 w-24" />
          <div className="flex flex-col gap-2">
            <Bone className="h-6 w-[70%]" />
            <Bone className="h-3 w-[45%]" />
          </div>
        </div>
        <div className="flex items-end justify-between border-t border-dashed border-dc-hairline pt-4">
          <Bone className="h-3 w-28" />
          <Bone className="size-[98px] rounded-lg" />
        </div>
      </div>
    </Status>
  );
}

/** Session or speaker detail: header block, meta lines, a paragraph. */
export function DetailSkeleton({ kind }: { kind: "session" | "speaker" }) {
  return (
    <Status
      label={kind === "session" ? "Loading session…" : "Loading speaker…"}
      className="mx-auto flex w-full max-w-[1312px] flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8 xl:px-0"
    >
      {kind === "speaker" ? (
        <div className="flex items-center gap-4">
          <Bone className="size-20 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Bone className="h-7 w-48" />
            <Bone className="h-4 w-32" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Bone className="h-4 w-28" />
          <Bone className="h-7 w-[85%] lg:w-[55%]" />
          <Bone className="h-7 w-[60%] lg:w-[35%]" />
          <div className="flex gap-3 pt-1">
            <Bone className="h-4 w-24" />
            <Bone className="h-4 w-20" />
            <Bone className="h-4 w-28" />
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2 rounded-xl border border-dc-hairline bg-white p-4 lg:max-w-[760px]">
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-[94%]" />
        <Bone className="h-4 w-[88%]" />
        <Bone className="h-4 w-[60%]" />
      </div>
    </Status>
  );
}

/** Notifications inbox: a day heading and three announcement cards. */
export function InboxSkeleton() {
  return (
    <Status label="Loading announcements…" className="flex flex-col gap-3">
      <Bone className="mb-0 h-[18px] w-20" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg border border-dc-hairline bg-white p-4">
          <Bone className="h-3 w-24" />
          <Bone className={cn("h-5", i === 1 ? "w-[50%]" : "w-[65%]")} />
          <Bone className="h-4 w-[90%]" />
        </div>
      ))}
    </Status>
  );
}

/** Live Q&A: three question rows (vote column + two lines). */
export function QASkeleton() {
  return (
    <Status label="Loading questions…" className="flex flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3 rounded-lg border border-dc-hairline bg-white p-3">
          <Bone className="h-10 w-9 shrink-0 rounded-md" />
          <div className="flex flex-1 flex-col gap-2 pt-0.5">
            <Bone className={cn("h-4", i === 2 ? "w-[55%]" : "w-[80%]")} />
            <Bone className="h-3 w-24" />
          </div>
        </div>
      ))}
    </Status>
  );
}
