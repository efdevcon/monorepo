"use client";

import { useMemo, useState } from "react";
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
import { Link } from "@/routing";
import { detailHref } from "@/routing/viewParams";

/**
 * The EF-only analytics page (/admin/analytics): Matomo site 38, live.
 *
 * Desktop is laid out to fit one screen without scrolling: the four "now"
 * tiles beside two daily charts (visits, unique visitors), a thin totals
 * strip, then the three lists the team asks about first (most viewed
 * sessions and speakers, most viewed pages with Q&A opens), then the rest in
 * descending importance (installs, sign-in, devices, countries, referrers,
 * the event catalogue and the full tables), always shown, so the page reads
 * top to bottom with nothing to unfold. Phones get the same blocks stacked. The page spans the layout's full
 * width (`expand`), not the catalogue pages' 1312px column.
 *
 * Session and speaker slugs come from Matomo as page paths; titles, tracks
 * and names are joined from the device's own catalogue (EventStore), so an
 * unknown slug just shows as itself. Q&A opens carry the Pretalx code, which
 * the catalogue has as `sourceId`.
 *
 * Day labels come from Matomo's site-local date keys and are formatted from
 * their parts, never through a Date in the viewer's zone, so a day never
 * shifts. The page keeps itself current (useAnalyticsReport).
 */

const card = "rounded-xl border border-dc-hairline bg-white p-4 lg:p-3";
const h2 = "text-[14px] font-bold leading-5 text-dc-fg2";
const muted = "text-[12px] leading-4 text-dc-muted";
const pill =
  "flex h-8 cursor-pointer items-center gap-2 rounded-full border border-dc-hairline bg-white px-3 text-[13px] leading-none text-dc-fg transition-colors duration-150 ease-out hover:bg-dc-purple-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-purple disabled:cursor-default disabled:opacity-60";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const fmtInt = (n: number) => Math.round(n).toLocaleString("en-GB");
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

function Stat({ label, value, hint, live }: { label: string; value: string; hint?: string; live?: boolean }) {
  return (
    <div className={cn(card, "flex flex-col justify-between")}>
      <p className={cn(muted, "flex items-center gap-1.5")}>
        {live && <span aria-hidden className="size-2 rounded-full bg-dc-green motion-safe:animate-pulse" />}
        {label}
      </p>
      <p className="mt-1 text-[26px] font-extrabold leading-8 tracking-[-0.5px] text-dc-fg2 tabular-nums">{value}</p>
      {hint && <p className={cn(muted, "mt-0.5")}>{hint}</p>}
    </div>
  );
}

/** One metric per day as bars; the last (lighter) bar is today so far. */
function DailyBars({
  days,
  metric,
  title,
  total,
}: {
  days: DayPoint[];
  metric: "visits" | "uniqVisitors";
  title: string;
  total?: string;
}) {
  const max = Math.max(1, ...days.map((d) => d[metric]));
  // Every label fits at 14 days; longer windows label every nth day and drop
  // the per-bar values.
  const every = Math.max(1, Math.ceil(days.length / 10));
  const values = days.length <= 14;
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <p className={h2}>{title}</p>
        {total && <p className={muted}>{total}</p>}
      </div>
      <div className="mt-2 flex h-32 items-end gap-1 lg:h-28">
        {days.map((d, i) => {
          const pct = (d[metric] / max) * (values ? 86 : 100);
          const last = i === days.length - 1;
          return (
            <div
              key={d.date}
              className="relative flex h-full min-w-0 flex-1 flex-col justify-end"
              title={`${fmtDay(d.date)}: ${fmtInt(d[metric])}`}
            >
              {values && (
                <span
                  className="absolute inset-x-0 truncate text-center text-[9px] leading-3 text-dc-muted tabular-nums"
                  style={{ bottom: `calc(${pct}% + 2px)` }}
                >
                  {fmtInt(d[metric])}
                </span>
              )}
              <div
                className={cn("w-full rounded-t-[3px]", last ? "bg-dc-purple-soft" : "bg-dc-purple")}
                style={{ height: `${pct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1">
        {days.map((d, i) => (
          <div key={d.date} className="min-w-0 flex-1 truncate text-center text-[10px] leading-4 text-dc-muted">
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
  sub?: string;
  href?: string;
  value: number;
  detail: string;
}

/** A top list: rank, title (linked when it is an app page), value, share bar. */
function Ranked({ items, limit, empty }: { items: RankedItem[]; limit: number; empty: string }) {
  const shown = items.slice(0, limit);
  if (shown.length === 0) return <p className={cn(muted, "mt-1")}>{empty}</p>;
  const max = Math.max(1, ...shown.map((i) => i.value));
  return (
    <ol className="mt-2 flex flex-col gap-1.5">
      {shown.map((item, i) => (
        <li key={item.key} className="text-[12px] leading-4">
          <div className="flex items-baseline gap-2">
            <span className="w-4 shrink-0 whitespace-nowrap text-right text-dc-muted tabular-nums">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-dc-fg2" title={item.sub ? `${item.title} · ${item.sub}` : item.title}>
              {item.href ? (
                <Link href={item.href} className="hover:underline">
                  {item.title}
                </Link>
              ) : (
                item.title
              )}
              {item.sub && <span className="text-dc-muted"> · {item.sub}</span>}
            </span>
            <span className="shrink-0 text-dc-muted tabular-nums">{item.detail}</span>
          </div>
          <div className="ml-6 mt-0.5 h-1 rounded-full bg-dc-lavender">
            <div className="h-1 rounded-full bg-dc-purple" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** A labelled list with share bars; `total` defaults to the rows' sum. */
function Breakdown({ title, rows, total, limit = 6 }: { title: string; rows: Row[]; total?: number; limit?: number }) {
  const shown = rows.slice(0, limit);
  const sum = total ?? rows.reduce((acc, r) => acc + r.visits, 0);
  return (
    <div>
      <p className={h2}>{title}</p>
      {shown.length === 0 ? (
        <p className={cn(muted, "mt-1")}>No data.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {shown.map((r) => {
            const pct = sum > 0 ? Math.round((r.visits / sum) * 100) : 0;
            return (
              <li key={r.label} className="text-[12px] leading-4">
                <div className="flex justify-between gap-2 text-dc-fg2">
                  <span className="min-w-0 truncate">{r.label}</span>
                  <span className="shrink-0 text-dc-muted tabular-nums">
                    {fmtInt(r.visits)} · {pct}%
                  </span>
                </div>
                <div className="mt-0.5 h-1 rounded-full bg-dc-lavender">
                  <div className="h-1 rounded-full bg-dc-purple" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
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
        href: detailHref("session", row.id),
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
        href: detailHref("speaker", row.id),
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
        href: s ? detailHref("session", s.id) : undefined,
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
      detail: `${fmtInt(row.events)} · ${fmtInt(row.visits)} visits`,
    }));

  const yesterday = r && r.days.length >= 2 ? r.days[r.days.length - 2] : null;
  const visitsTotal = r ? r.totals.newVisits + r.totals.returningVisits : 0;
  const avgUniq = r && r.days.length > 0 ? r.days.reduce((a, d) => a + d.uniqVisitors, 0) / r.days.length : 0;

  return (
    // `expand`: span the layout grid's full width (globals.css .section),
    // unlike the 1312px column the catalogue pages keep; a dashboard wants
    // the whole desktop.
    <div className="expand px-4 py-4 font-heading lg:px-6 lg:pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3 lg:pt-2">
        <div>
          <h1 className="text-[24px] font-extrabold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">App analytics</h1>
          <p className={cn(muted, "mt-1")}>
            Live from Matomo{r?.site.name ? `, ${r.site.name}` : ""}. Days follow the site&apos;s clock
            {r?.site.timezone ? ` (${r.site.timezone})` : ""}. Re-read every two minutes while open.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-dc-hairline bg-white p-0.5" role="group" aria-label="Window">
            {WINDOWS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setDays(w)}
                aria-pressed={w === days}
                className={cn(
                  "h-7 cursor-pointer rounded-full px-3 text-[13px] font-semibold leading-none transition-colors",
                  w === days ? "bg-dc-purple text-white" : "text-dc-fg2 hover:bg-dc-purple-wash"
                )}
              >
                {w} days
              </button>
            ))}
          </div>
          <button type="button" onClick={() => void refresh()} className={pill} disabled={loading}>
            <RefreshCw className={cn("size-4 text-dc-purple", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-dc-error-border bg-white p-3 text-[14px] leading-5 text-dc-error">
          {error}
        </p>
      )}
      {!r && !error && <p className={cn(muted, "mt-6")}>Loading…</p>}

      {r && (
        <>
          {/* Row 1: right now beside the two daily charts. */}
          <section className="mt-3 grid gap-3 lg:grid-cols-12" aria-label="Right now and per day">
            <div className="grid grid-cols-2 gap-3 lg:col-span-4">
              <Stat
                live
                label="On the app right now"
                value={fmtInt(r.live.visitors)}
                hint={`${fmtInt(r.live.actions)} actions in ${r.live.minutes} min`}
              />
              <Stat
                label="Visits today"
                value={fmtInt(r.today?.visits ?? 0)}
                hint={yesterday ? `Yesterday ${fmtInt(yesterday.visits)}` : undefined}
              />
              <Stat
                label="Unique visitors today"
                value={fmtInt(r.today?.uniqVisitors ?? 0)}
                hint={yesterday ? `Yesterday ${fmtInt(yesterday.uniqVisitors)}` : undefined}
              />
              <Stat
                label="Actions today"
                value={fmtInt(r.today?.actions ?? 0)}
                hint={yesterday ? `Yesterday ${fmtInt(yesterday.actions)}` : "Page views and events"}
              />
            </div>
            <div className={cn(card, "grid gap-4 sm:grid-cols-2 lg:col-span-8")}>
              <DailyBars
                days={r.days}
                metric="visits"
                title="Visits per day"
                total={`${fmtInt(r.totals.visits)} in ${r.windowDays} days`}
              />
              <DailyBars
                days={r.days}
                metric="uniqVisitors"
                title="Unique visitors per day"
                total={`about ${fmtInt(avgUniq)} a day`}
              />
            </div>
          </section>

          {/* Row 2: the window's totals, one thin strip. */}
          <section className={cn(card, "mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4 lg:py-2")} aria-label="Totals">
            {[
              ["New visits", `${fmtInt(r.totals.newVisits)}${visitsTotal ? ` · ${Math.round((r.totals.newVisits / visitsTotal) * 100)}%` : ""}`],
              ["Returning visits", `${fmtInt(r.totals.returningVisits)}${visitsTotal ? ` · ${Math.round((r.totals.returningVisits / visitsTotal) * 100)}%` : ""}`],
              ["Bounce rate", `${Math.round(r.totals.bounceRate)}%`],
              ["Average time in the app", fmtDuration(r.totals.avgTimeOnSite)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-2 sm:block">
                <p className={muted}>{label}</p>
                <p className="text-[14px] font-bold leading-5 text-dc-fg2 tabular-nums">{value}</p>
              </div>
            ))}
          </section>

          {/* Row 3: what the team asks first. */}
          <section className="mt-3 grid gap-3 lg:grid-cols-3" aria-label="Sessions, speakers and pages">
            <div className={card}>
              <p className={h2}>Most viewed sessions</p>
              <Ranked items={topSessions} limit={8} empty="No session pages viewed in this window." />
            </div>
            <div className={card}>
              <p className={h2}>Most viewed speakers</p>
              <Ranked items={topSpeakers} limit={8} empty="No speaker pages viewed in this window." />
            </div>
            <div className={cn(card, "flex flex-col gap-4")}>
              <div>
                <p className={h2}>Most viewed pages</p>
                <Ranked items={topPages} limit={5} empty="No page views yet." />
              </div>
              <div>
                <p className={h2}>Q&amp;A opened, by session</p>
                <Ranked items={qaOpens} limit={4} empty="No Q&A opened in this window." />
              </div>
            </div>
          </section>

          <section className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="How the app is used">
            <div className={cn(card, "flex flex-col gap-4")}>
              <Breakdown title="Installed app vs browser" rows={r.dimensions.displayMode} />
              <Breakdown title="Signed in" rows={r.dimensions.signedIn} />
            </div>
            <div className={cn(card, "flex flex-col gap-4")}>
              <Breakdown title="Device" rows={r.devices.types} limit={4} />
              <Breakdown title="Operating system" rows={r.devices.os} limit={5} />
            </div>
            <div className={cn(card, "flex flex-col gap-4")}>
              <Breakdown title="Browser" rows={r.devices.browsers} limit={5} />
              <Breakdown title="Starred sessions per visit" rows={sortBands(r.dimensions.stars)} limit={5} />
            </div>
            <div className={cn(card, "flex flex-col gap-4")}>
              <Breakdown title="Country" rows={r.countries} total={r.totals.visits} limit={6} />
              <Breakdown title="How visits arrived" rows={r.referrers} limit={5} />
            </div>
          </section>

          {/* What went wrong, without anyone's data. */}
          <section className="mt-3 grid gap-3 lg:grid-cols-2" aria-label="Health">
            <div className={card}>
              <p className={h2}>Failures and friction</p>
              <p className={cn(muted, "mt-1")}>
                What the app reports when something goes wrong: count, and the visits it happened in out of{" "}
                {fmtInt(r.totals.visits)}. Names are routes, datasets and services, never a person.
              </p>
              {r.health.failures.length === 0 ? (
                <p className={cn(muted, "mt-2")}>Nothing reported in this window.</p>
              ) : (
                <table className="mt-2 w-full text-[12px] leading-4">
                  <tbody>
                    {r.health.failures.map((f) => (
                      <tr key={`${f.category}-${f.action}`} className="border-t border-dc-hairline">
                        <td className="w-full py-1.5 pr-2 text-dc-fg2">
                          <span className="mr-1.5 rounded-[3px] bg-dc-lavender px-1 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3px] text-dc-purple">
                            {f.category}
                          </span>
                          {FAILURE_WORDS[`${f.category}/${f.action}`] ?? f.action}
                        </td>
                        <td className="py-1.5 pr-2 whitespace-nowrap text-right text-dc-fg2 tabular-nums">{fmtInt(f.events)}</td>
                        <td className="py-1.5 whitespace-nowrap text-right text-dc-muted tabular-nums">
                          {fmtInt(f.visits)} visits
                          {r.totals.visits > 0 ? ` · ${((f.visits / r.totals.visits) * 100).toFixed(1)}%` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className={cn(card, "flex flex-col gap-4")}>
              <div>
                <p className={h2}>Crash page, by route</p>
                <Ranked items={named(r.health.errorPages)} limit={5} empty="No crash page shown in this window." />
              </div>
              <div>
                <p className={h2}>Catalogue sync failed, by dataset</p>
                <Ranked items={named(r.health.syncFailures)} limit={4} empty="No sync failures in this window." />
              </div>
              <div>
                <p className={h2}>Supabase through the app proxy, by service</p>
                <Ranked items={named(r.health.proxyServices)} limit={4} empty="No proxy fallbacks in this window." />
              </div>
            </div>
          </section>

          <section className="mt-3 grid gap-3 lg:grid-cols-2" aria-label="Pages and events">
            <div className={card}>
              <p className={h2}>All top pages</p>
              <p className={cn(muted, "mt-1")}>Page views, and the visits that included the page.</p>
              <table className="mt-2 w-full text-[12px] leading-4">
                <tbody>
                  {r.pages.map((p) => (
                    <tr key={p.label} className="border-t border-dc-hairline">
                      <td className="w-full max-w-0 truncate py-1.5 pr-2 text-dc-fg2" title={p.label}>
                        {p.label}
                      </td>
                      <td className="py-1.5 pr-2 whitespace-nowrap text-right text-dc-fg2 tabular-nums">{fmtInt(p.hits)}</td>
                      <td className="py-1.5 whitespace-nowrap text-right text-dc-muted tabular-nums">{fmtInt(p.visits)} visits</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={card}>
              <p className={h2}>Events</p>
              <p className={cn(muted, "mt-1")}>From the app&apos;s event catalogue: count, and the visits that fired it.</p>
              <table className="mt-2 w-full text-[12px] leading-4">
                <tbody>
                  {r.events.map((e) => (
                    <tr key={`${e.category}-${e.action}`} className="border-t border-dc-hairline">
                      <td className="w-full py-1.5 pr-2 text-dc-fg2">
                        <span className="mr-1.5 rounded-[3px] bg-dc-lavender px-1 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3px] text-dc-purple">
                          {e.category}
                        </span>
                        {e.action}
                      </td>
                      <td className="py-1.5 pr-2 whitespace-nowrap text-right text-dc-fg2 tabular-nums">{fmtInt(e.events)}</td>
                      <td className="py-1.5 whitespace-nowrap text-right text-dc-muted tabular-nums">{fmtInt(e.visits)} visits</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {r.warnings.length > 0 && (
            <p className={cn(muted, "mt-3")}>Some reports did not load: {r.warnings.join("; ")}.</p>
          )}
          <p className={cn(muted, "mt-3")}>
            Updated {updatedAt ? new Date(updatedAt).toLocaleTimeString() : "…"}. Figures count browsers, not
            people: one person on two devices is two visitors.
          </p>
        </>
      )}
    </div>
  );
}
