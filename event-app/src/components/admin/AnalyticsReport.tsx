"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import cn from "classnames";
import { RefreshCw } from "lucide-react";
import {
  DEFAULT_WINDOW,
  WINDOWS,
  type DayPoint,
  type Row,
  type WindowDays,
} from "@/app/api/admin/analytics/report";
import { useAnalyticsReport } from "@/data/admin/useAnalyticsReport";
import { useSessionsOfAllProgrammes } from "@/data/hooks/use-sessions";
import { useSpeakers } from "@/data/hooks/use-speakers";
import { Segmented } from "@/components/Segmented";
import { Bone, Status } from "@/components/Skeletons";
import { toolPill } from "@/components/internal/EfInternalTools";
import { DetailLink } from "@/routing/DetailLink";
import type { DetailKind } from "@/routing/viewParams";

/**
 * The EF-only analytics page (/admin/analytics): Matomo site 38, live.
 *
 * One number leads: the people on the app right now, in the only card on
 * the page, with today's figures and the window's rates as a quiet row
 * beneath it and the visits-per-day chart beside it. Everything else is a
 * plain section under a real heading, in the order the team asks: Content
 * (sessions, speakers, pages, Q&A, stars), Audience (installed, signed in,
 * devices, countries, referrers), Health (the failure events), then the full
 * page and event tables. No bars under ranked lists, share bars only where
 * the share is the point (Audience), one footnote for the caveats. Phones
 * get the same blocks stacked. The page spans the layout's full width
 * (`expand`), not the catalogue pages' 1312px column.
 *
 * Session and speaker slugs come from Matomo as page paths; titles, tracks
 * and names are joined from the device's own catalogue (EventStore), so an
 * unknown slug just shows as itself. Q&A opens carry the Pretalx code, which
 * the catalogue has as `sourceId`.
 *
 * Day labels come from Matomo's site-local date keys and are formatted from
 * their parts, never through a Date in the viewer's zone, so a day never
 * shifts. The page keeps itself current (useAnalyticsReport); while a new
 * window loads, the old one stays at half opacity instead of vanishing.
 */

const card = "rounded-xl border border-dc-hairline bg-white p-4 lg:p-5";
const h2 = "text-[16px] font-bold leading-6 text-dc-fg2";
const h3 = "text-[14px] font-bold leading-5 text-dc-fg2";
const muted = "text-[12px] leading-4 text-dc-muted";
const rowText = "text-[13px] leading-[18px]";
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-purple";

const WINDOW_ITEMS: readonly { value: WindowDays; label: string }[] = WINDOWS.map((w) => ({ value: w, label: `${w} days` }));

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const fmtInt = (n: number) => Math.round(n).toLocaleString("en-GB");
const fmtPct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "0%");
const fmtDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};
/** "Sun 2 Nov" from a site-local YYYY-MM-DD key (weekday via a UTC date, so no zone shift). */
function fmtDay(key: string, withWeekday = true): string {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return key;
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${withWeekday ? `${weekday} ` : ""}${d} ${MONTHS[m - 1]}`;
}

/** A page section: a real heading (the outline had none), an optional note, no card. */
function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className="mt-8" aria-labelledby={id}>
      <h2 id={id} className={h2}>
        {title}
      </h2>
      {note && <p className={cn(muted, "mt-0.5")}>{note}</p>}
      {children}
    </section>
  );
}

/** A secondary figure under the hero: label, value, an optional comparison line. */
function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className={muted}>{label}</dt>
      <dd className="mt-0.5 text-[16px] font-bold leading-6 text-dc-fg2">{value}</dd>
      {hint && <dd className={muted}>{hint}</dd>}
    </div>
  );
}

/**
 * Visits per day as bars. The highest day and today are labelled; every
 * other bar reads on hover, focus or tap, so the values reach the keyboard
 * and a finger as well as a mouse. Today (so far) is the lighter bar.
 */
function DailyBars({ days }: { days: DayPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const n = days.length;
  const max = Math.max(1, ...days.map((d) => d.visits));
  const maxIndex = days.findIndex((d) => d.visits === max);
  // Every day is labelled at 14 days; longer windows label every nth day.
  const every = Math.max(1, Math.ceil(n / 10));
  return (
    <div className="min-w-0">
      <ol className="relative flex h-40 items-end gap-1 pt-5 lg:h-36" aria-label="Visits per day">
        {days.map((d, i) => {
          const pct = Math.max(1.5, (d.visits / max) * 100);
          const last = i === n - 1;
          const open = active === i;
          const labelled = open || (active === null && (i === maxIndex || last));
          return (
            <li key={d.date} className="relative h-full min-w-0 flex-1">
              <button
                type="button"
                className={cn("flex h-full w-full cursor-default flex-col justify-end rounded-sm", focusRing)}
                aria-label={`${fmtDay(d.date)}${last ? ", so far" : ""}: ${fmtInt(d.visits)} visits, ${fmtInt(d.uniqVisitors)} unique`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive((a) => (a === i ? null : a))}
                onFocus={() => setActive(i)}
                onBlur={() => setActive((a) => (a === i ? null : a))}
                onClick={() => setActive((a) => (a === i ? null : i))}
              >
                <span
                  className={cn(
                    "block w-full rounded-t-[3px] transition-colors duration-150 ease-out",
                    open ? "bg-dc-purple-600" : last ? "bg-dc-purple-soft" : "bg-dc-purple"
                  )}
                  style={{ height: `${pct}%` }}
                />
              </button>
              {labelled && (
                <div
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute z-10 whitespace-nowrap text-[11px] leading-4 tabular-nums",
                    i < 2 ? "left-0" : i > n - 3 ? "right-0" : "left-1/2 -translate-x-1/2",
                    open
                      ? "rounded-md border border-dc-hairline bg-white px-2 py-1 text-left text-dc-fg2 shadow-[0px_1px_3px_rgba(22,11,43,0.1),0px_1px_2px_rgba(22,11,43,0.1)]"
                      : "text-center font-semibold text-dc-fg2"
                  )}
                  style={{ bottom: `calc(${pct}% + 4px)` }}
                >
                  {open ? (
                    <>
                      <span className="block text-dc-muted">
                        {fmtDay(d.date)}
                        {last ? ", so far" : ""}
                      </span>
                      <span className="block">{fmtInt(d.visits)} visits</span>
                      <span className="block text-dc-muted">{fmtInt(d.uniqVisitors)} unique</span>
                    </>
                  ) : (
                    fmtInt(d.visits)
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-1 flex gap-1" aria-hidden>
        {days.map((d, i) => (
          <div key={d.date} className="min-w-0 flex-1 truncate text-center text-[11px] leading-4 text-dc-muted">
            {i % every === 0 ? fmtDay(d.date, false) : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

interface RankedItem {
  key: string;
  title: string;
  /** A second, muted line (the session's track). */
  sub?: string;
  /** The app page this row stands for; the row becomes a tap-sized link to it. */
  link?: { kind: DetailKind; id: string };
  value: number;
  detail: string;
}

/** A top list: rank, title, value. Rows that are app pages are links at finger size. */
function Ranked({ items, limit, empty }: { items: RankedItem[]; limit: number; empty: string }) {
  const shown = items.slice(0, limit);
  if (shown.length === 0) return <p className={cn(muted, "mt-2")}>{empty}</p>;
  const row = "flex items-center gap-2";
  return (
    <ol className="mt-2 flex flex-col">
      {shown.map((item, i) => {
        const inner = (
          <>
            <span className={cn(muted, "w-5 shrink-0 text-right tabular-nums")}>{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className={cn(rowText, "block truncate text-dc-fg2")}>{item.title}</span>
              {item.sub && <span className={cn(muted, "block truncate")}>{item.sub}</span>}
            </span>
            <span className={cn(rowText, "shrink-0 text-dc-muted tabular-nums")}>{item.detail}</span>
          </>
        );
        return (
          <li key={item.key} className="border-t border-dc-hairline first:border-t-0">
            {item.link ? (
              <DetailLink
                kind={item.link.kind}
                id={item.link.id}
                title={item.sub ? `${item.title}, ${item.sub}` : item.title}
                className={cn(
                  row,
                  focusRing,
                  "-mx-2 min-h-11 rounded-md px-2 py-1.5 transition-colors duration-150 ease-out hover:bg-dc-purple-wash"
                )}
              >
                {inner}
              </DetailLink>
            ) : (
              <div className={cn(row, "py-1.5")} title={item.title}>
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** One row of a share list: label, count, percent, a thin bar for the percent. */
function ShareRow({ label, count, pct, pctLabel }: { label: string; count: number; pct: number; pctLabel?: string }) {
  return (
    <li className={rowText}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-dc-fg2">{label}</span>
        <span className="flex shrink-0 gap-3 tabular-nums">
          <span className="text-dc-fg2">{fmtInt(count)}</span>
          <span className="w-9 text-right text-dc-muted">{pctLabel ?? `${pct}%`}</span>
        </span>
      </div>
      <div className="mt-1 h-1 rounded-full bg-dc-lavender">
        <div className="h-1 rounded-full bg-dc-purple" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
    </li>
  );
}

/**
 * A share breakdown with a bar per row. `total` is the window's visits,
 * never the rows' sum: Matomo caps the device, OS and browser reports at
 * six rows, so a sum over them made "Chrome 71%" the share of the top six.
 */
function Breakdown({ title, rows, total, limit = 6 }: { title: string; rows: Row[]; total: number; limit?: number }) {
  const shown = rows.slice(0, limit);
  return (
    <div className="min-w-0">
      <h3 className={h3}>{title}</h3>
      {shown.length === 0 ? (
        <p className={cn(muted, "mt-2")}>No data.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {shown.map((r) => (
            <ShareRow key={r.label} label={r.label} count={r.visits} pct={total > 0 ? Math.round((r.visits / total) * 100) : 0} />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Steps of one flow as the visits that reached each, each as a share of
 * the first (the base shows no percent). Visits, not event counts: one
 * person tapping Install five times is one visit that tapped.
 */
function Funnel({ title, steps, empty }: { title: string; steps: { label: string; visits: number }[]; empty: string }) {
  const base = steps[0]?.visits ?? 0;
  return (
    <div className="min-w-0">
      <h3 className={h3}>{title}</h3>
      {base === 0 ? (
        <p className={cn(muted, "mt-2")}>{empty}</p>
      ) : (
        <ol className="mt-2 flex flex-col gap-2">
          {steps.map((s, i) => (
            <ShareRow
              key={s.label}
              label={s.label}
              count={s.visits}
              pct={Math.round((s.visits / base) * 100)}
              pctLabel={i === 0 ? "" : undefined}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

/** A small table with a header row; numeric columns right-aligned in tabular figures. */
function DataTable({
  columns,
  rows,
}: {
  columns: { label: string; numeric?: boolean }[];
  rows: { key: string; cells: ReactNode[] }[];
}) {
  const lane = (numeric: boolean | undefined) =>
    numeric ? "whitespace-nowrap pl-3 text-right tabular-nums" : "w-full max-w-0 truncate pr-2 text-left";
  return (
    <table className={cn(rowText, "mt-2 w-full")}>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.label} scope="col" className={cn(lane(c.numeric), muted, "pb-1.5 font-medium")}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-t border-dc-hairline">
            {r.cells.map((c, i) => (
              // The name and the first count carry the row; later counts are quieter.
              <td key={i} className={cn(lane(columns[i]?.numeric), "py-1.5", i <= 1 ? "text-dc-fg2" : "text-dc-muted")}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** "category action" with the category quiet, instead of a chip. */
function EventName({ category, action }: { category: string; action: string }) {
  return (
    <>
      <span className="text-dc-muted">{category} </span>
      {action}
    </>
  );
}

/** Plain words for the failure events (data/analytics/track.ts), keyed "category/action". */
const FAILURE_WORDS: Record<string, string> = {
  "error/page": "Crash page shown",
  "sync/bundle-failed": "Catalogue sync failed while online",
  "network/supabase-proxy": "Supabase unreachable, went through the app proxy",
  "network/token-rate-limited": "Sign-in token refresh rate-limited",
  "sign-in/code-failed": "Sign-in code could not be sent",
  "sign-in/verify-failed": "Sign-in code rejected",
  "feedback/failed": "Feedback report dropped",
  "sw/update-slow": "App update still pending after the reload",
};

/** Stars bands sort by their lower bound ("0", "1-5", "6-20", "21+"); Matomo's "not defined" last. */
function sortBands(rows: Row[]): Row[] {
  const key = (r: Row) => {
    const n = parseInt(r.label, 10);
    return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
  };
  return [...rows].sort((a, b) => key(a) - key(b));
}

/** The hero block's shape while the first report loads, so the page doesn't jump. */
function ReportSkeleton() {
  const bars = [40, 65, 55, 80, 100, 70, 30];
  return (
    <Status label="Loading the report…" className="mt-4 grid gap-3 lg:grid-cols-12">
      <div className={cn(card, "flex flex-col gap-5 lg:col-span-5")}>
        <div>
          <Bone className="h-4 w-40" />
          <Bone className="mt-2 h-11 w-24" />
          <Bone className="mt-3 h-4 w-52" />
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i}>
              <Bone className="h-4 w-24" />
              <Bone className="mt-1 h-6 w-14" />
            </div>
          ))}
        </div>
      </div>
      <div className={cn(card, "lg:col-span-7")}>
        <Bone className="h-5 w-28" />
        <div className="mt-3 flex h-40 items-end gap-1 pt-5 lg:h-36">
          {bars.map((h, i) => (
            <Bone key={i} className="flex-1 rounded-t-[3px] rounded-b-none" style={{ height: `${h}%` }} />
          ))}
        </div>
        <Bone className="mt-2 h-4 w-full" />
      </div>
    </Status>
  );
}

export function AnalyticsReport() {
  const [days, setDays] = useState<WindowDays>(DEFAULT_WINDOW);
  const { report: r, error, loading, updatedAt, refresh } = useAnalyticsReport(days);

  // The device's own catalogue, for titles and names behind Matomo's slugs.
  const sessions = useSessionsOfAllProgrammes();
  const { speakers } = useSpeakers();
  const sessionById = useMemo(() => new Map(sessions.map((s) => [s.id, s])), [sessions]);
  const sessionByCode = useMemo(() => {
    const m = new Map<string, (typeof sessions)[number]>();
    for (const s of sessions) if (s.sourceId) m.set(s.sourceId, s);
    return m;
  }, [sessions]);
  const speakerById = useMemo(() => new Map(speakers.map((s) => [s.id, s])), [speakers]);

  // Slugs are whatever visitors put after /schedule/ or /speakers/, so once
  // the catalogue is on the device only known ones are listed: no junk rows,
  // no links to pages that do not exist. Before it loads, the raw slug shows.
  const catalogueReady = sessions.length > 0 && speakers.length > 0;
  const topSessions: RankedItem[] = (r?.sessions ?? []).flatMap((row) => {
    const s = sessionById.get(row.id);
    if (catalogueReady && !s) return [];
    return [
      {
        key: row.id,
        title: s?.title ?? row.id,
        sub: s?.track || undefined,
        link: { kind: "session" as const, id: row.id },
        value: row.hits,
        detail: `${fmtInt(row.hits)} views`,
      },
    ];
  });
  const topSpeakers: RankedItem[] = (r?.speakers ?? []).flatMap((row) => {
    const s = speakerById.get(row.id);
    if (catalogueReady && !s) return [];
    return [
      {
        key: row.id,
        title: s?.name ?? row.id,
        link: { kind: "speaker" as const, id: row.id },
        value: row.hits,
        detail: `${fmtInt(row.hits)} views`,
      },
    ];
  });
  const topPages: RankedItem[] = (r?.pages ?? []).map((p) => ({
    key: p.label,
    title: p.label,
    value: p.hits,
    detail: `${fmtInt(p.hits)} views`,
  }));
  const qaOpens: RankedItem[] = (r?.qa ?? []).flatMap((row) => {
    const s = sessionByCode.get(row.code);
    if (catalogueReady && !s) return [];
    return [
      {
        key: row.code,
        title: s?.title ?? row.code,
        link: s ? { kind: "session" as const, id: s.id } : undefined,
        value: row.events,
        detail: `${fmtInt(row.events)} opens`,
      },
    ];
  });

  const named = (rows: { name: string; events: number; visits: number }[]): RankedItem[] =>
    rows.map((row) => ({
      key: row.name,
      title: row.name,
      value: row.events,
      detail: `${fmtInt(row.events)} in ${fmtInt(row.visits)} visits`,
    }));

  // Funnel steps from the event list (visits that fired the event). Matomo
  // lists only events that happened, so a missing row is zero.
  const eventVisits = (category: string, action: string) =>
    r?.events.find((e) => e.category === category && e.action === action)?.visits ?? 0;
  const installFunnel = [
    { label: "Install tapped", visits: eventVisits("install", "tap") },
    { label: "Prompt accepted", visits: eventVisits("install", "prompt-accepted") },
    { label: "Installed", visits: eventVisits("install", "installed") },
  ];
  const signInFunnel = [
    { label: "Code requested", visits: eventVisits("sign-in", "code-requested") },
    { label: "Signed in", visits: eventVisits("sign-in", "verified") },
  ];

  const yesterday = r && r.days.length >= 2 ? r.days[r.days.length - 2] : null;
  const visitsSplit = r ? r.totals.newVisits + r.totals.returningVisits : 0;
  const avgUniq = r && r.days.length > 0 ? r.days.reduce((a, d) => a + d.uniqVisitors, 0) / r.days.length : 0;
  // A window was picked and its report is still on the way: keep the old
  // one on screen, dimmed, rather than a blank page or a stale-looking full one.
  const stale = r !== null && r.windowDays !== days;

  return (
    // `expand`: span the layout grid's full width (globals.css .section),
    // unlike the 1312px column the catalogue pages keep; a dashboard wants
    // the whole desktop.
    <div className="expand px-4 py-4 font-heading lg:px-6 lg:pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3 lg:pt-2">
        <div>
          <h1 className="text-[24px] font-extrabold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">App analytics</h1>
          <p className={cn(muted, "mt-1")}>
            Matomo{r?.site.name ? ` for ${r.site.name}` : ""}, live. Days follow the site&apos;s clock
            {r?.site.timezone ? ` (${r.site.timezone})` : ""}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Segmented value={days} onChange={setDays} items={WINDOW_ITEMS} label="Window" />
          <button
            type="button"
            onClick={() => void refresh()}
            className={cn(toolPill, "disabled:cursor-default disabled:opacity-60")}
            disabled={loading}
          >
            <RefreshCw className={cn(loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-dc-error-border bg-white p-3 text-[14px] leading-5 text-dc-error">
          {error}
        </p>
      )}
      {!r && !error && <ReportSkeleton />}

      {r && (
        <div className={cn("transition-opacity duration-150 ease-out", stale && "opacity-50")} aria-busy={stale}>
          {/* The one card: right now, today, the window's rates, the chart. */}
          <section className="mt-4 grid gap-3 lg:grid-cols-12" aria-label="Right now and per day">
            <div className={cn(card, "flex flex-col gap-5 lg:col-span-5")}>
              <div>
                <h2 className={muted}>On the app right now</h2>
                <p className="mt-1 text-[44px] font-extrabold leading-none tracking-[-1px] text-dc-fg2">
                  {fmtInt(r.live.visitors)}
                </p>
                <p className={cn(muted, "mt-2 flex items-center gap-1.5")}>
                  <span aria-hidden className="size-2 shrink-0 rounded-full bg-dc-green motion-safe:animate-pulse" />
                  Live, {fmtInt(r.live.actions)} actions in the last {r.live.minutes} minutes
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                <Figure
                  label="Visits today"
                  value={fmtInt(r.today?.visits ?? 0)}
                  hint={yesterday ? `Yesterday ${fmtInt(yesterday.visits)}` : undefined}
                />
                <Figure
                  label="Unique visitors today"
                  value={fmtInt(r.today?.uniqVisitors ?? 0)}
                  hint={yesterday ? `Yesterday ${fmtInt(yesterday.uniqVisitors)}` : undefined}
                />
                <Figure
                  label="Actions today"
                  value={fmtInt(r.today?.actions ?? 0)}
                  hint={yesterday ? `Yesterday ${fmtInt(yesterday.actions)}` : "Page views and events"}
                />
                <Figure
                  label="New visits"
                  value={fmtPct(r.totals.newVisits, visitsSplit)}
                  hint={`${fmtInt(r.totals.newVisits)} of ${fmtInt(visitsSplit)} in ${r.windowDays} days`}
                />
                <Figure label="Bounce rate" value={`${Math.round(r.totals.bounceRate)}%`} hint={`${r.windowDays} days`} />
                <Figure label="Time in the app" value={fmtDuration(r.totals.avgTimeOnSite)} hint="Per visit" />
              </dl>
            </div>
            <div className={cn(card, "lg:col-span-7")}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className={h3}>Visits per day</h2>
                <p className={cn(muted, "flex flex-wrap gap-x-3")}>
                  <span>
                    {fmtInt(r.totals.visits)} in {r.windowDays} days
                  </span>
                  <span>about {fmtInt(avgUniq)} unique a day</span>
                </p>
              </div>
              <DailyBars days={r.days} />
              <p className={cn(muted, "mt-2")}>The lighter bar is today so far.</p>
            </div>
          </section>

          <Section title="Content" note="What people open. Sessions and speakers link to their pages.">
            <div className="mt-3 grid gap-x-8 gap-y-6 lg:grid-cols-3">
              <div className="min-w-0">
                <h3 className={h3}>Most viewed sessions</h3>
                <Ranked items={topSessions} limit={8} empty="No session pages viewed in this window." />
              </div>
              <div className="min-w-0">
                <h3 className={h3}>Most viewed speakers</h3>
                <Ranked items={topSpeakers} limit={8} empty="No speaker pages viewed in this window." />
              </div>
              <div className="flex min-w-0 flex-col gap-6">
                <div>
                  <h3 className={h3}>Most viewed pages</h3>
                  <Ranked items={topPages} limit={5} empty="No page views yet." />
                </div>
                <div>
                  <h3 className={h3}>Q&amp;A opened, by session</h3>
                  <Ranked items={qaOpens} limit={4} empty="No Q&A opened in this window." />
                </div>
                <Breakdown title="Starred sessions per visit" rows={sortBands(r.dimensions.stars)} total={r.totals.visits} limit={5} />
              </div>
            </div>
          </Section>

          <Section
            title="Audience"
            note={`Shares of the ${fmtInt(r.totals.visits)} visits in ${r.windowDays} days; the two flows count visits that reached each step.`}
          >
            <div className="mt-3 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              <Breakdown title="Installed app or browser" rows={r.dimensions.displayMode} total={r.totals.visits} />
              <Funnel title="Install flow" steps={installFunnel} empty="No install taps in this window." />
              <Breakdown title="Signed in" rows={r.dimensions.signedIn} total={r.totals.visits} />
              <Funnel title="Sign-in flow" steps={signInFunnel} empty="No sign-in codes requested in this window." />
              <Breakdown title="Device" rows={r.devices.types} total={r.totals.visits} limit={4} />
              <Breakdown title="Operating system" rows={r.devices.os} total={r.totals.visits} limit={5} />
              <Breakdown title="Browser" rows={r.devices.browsers} total={r.totals.visits} limit={5} />
              <Breakdown title="Country" rows={r.countries} total={r.totals.visits} limit={6} />
              <Breakdown title="How visits arrived" rows={r.referrers} total={r.totals.visits} limit={5} />
            </div>
          </Section>

          <Section title="Health" note="What the app reports when something goes wrong, and the visits it happened in.">
            <div className="mt-3 grid gap-x-8 gap-y-6 lg:grid-cols-2">
              <div className="min-w-0">
                <h3 className={h3}>Failures and friction</h3>
                {r.health.failures.length === 0 ? (
                  <p className={cn(muted, "mt-2")}>Nothing reported in this window.</p>
                ) : (
                  <DataTable
                    columns={[{ label: "What happened" }, { label: "Count", numeric: true }, { label: "Visits", numeric: true }, { label: "Share", numeric: true }]}
                    rows={r.health.failures.map((f) => ({
                      key: `${f.category}-${f.action}`,
                      cells: [
                        FAILURE_WORDS[`${f.category}/${f.action}`] ?? <EventName category={f.category} action={f.action} />,
                        fmtInt(f.events),
                        fmtInt(f.visits),
                        r.totals.visits > 0 ? `${((f.visits / r.totals.visits) * 100).toFixed(1)}%` : "",
                      ],
                    }))}
                  />
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-6">
                <div>
                  <h3 className={h3}>Crash page, by route</h3>
                  <Ranked items={named(r.health.errorPages)} limit={5} empty="No crash page shown in this window." />
                </div>
                <div>
                  <h3 className={h3}>Catalogue sync failed, by dataset</h3>
                  <Ranked items={named(r.health.syncFailures)} limit={4} empty="No sync failures in this window." />
                </div>
                <div>
                  <h3 className={h3}>Supabase through the app proxy, by service</h3>
                  <Ranked items={named(r.health.proxyServices)} limit={4} empty="No proxy fallbacks in this window." />
                </div>
              </div>
            </div>
          </Section>

          <Section title="All pages and events">
            <div className="mt-3 grid gap-x-8 gap-y-6 lg:grid-cols-2">
              <div className="min-w-0">
                <h3 className={h3}>Top pages</h3>
                <DataTable
                  columns={[{ label: "Page" }, { label: "Views", numeric: true }, { label: "Visits", numeric: true }]}
                  rows={r.pages.map((p) => ({ key: p.label, cells: [p.label, fmtInt(p.hits), fmtInt(p.visits)] }))}
                />
              </div>
              <div className="min-w-0">
                <h3 className={h3}>Events</h3>
                <DataTable
                  columns={[{ label: "Event" }, { label: "Count", numeric: true }, { label: "Visits", numeric: true }]}
                  rows={r.events.map((e) => ({
                    key: `${e.category}-${e.action}`,
                    cells: [<EventName key="name" category={e.category} action={e.action} />, fmtInt(e.events), fmtInt(e.visits)],
                  }))}
                />
              </div>
            </div>
          </Section>

          {r.warnings.length > 0 && (
            <p className={cn(muted, "mt-6")}>Some reports did not load: {r.warnings.join("; ")}.</p>
          )}
          <p className={cn(muted, "mt-6 max-w-[65ch]")}>
            Updated {updatedAt ? new Date(updatedAt).toLocaleTimeString() : "…"}, re-read every two minutes while open.
            Figures count browsers, not people: one person on two devices is two visitors. Event names are routes,
            datasets and services, never a person.
          </p>
        </div>
      )}
    </div>
  );
}
