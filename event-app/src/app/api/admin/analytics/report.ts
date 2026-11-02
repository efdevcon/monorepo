import { DIMENSION } from "@/data/analytics/track";

/**
 * The EF analytics page's data (/admin/analytics): one Matomo bulk request
 * for site 38, shaped into a compact report. `bulkQueries` lists the reports
 * in a fixed order and `shapeReport` reads the bulk answer by the same
 * index, so the two must move together. Pure, covered by `data:test`.
 *
 * Matomo answer shapes this relies on: a single period (`date=today`, or a
 * `range`) comes back as one flat metrics object; `period=day&date=lastN`
 * as an object keyed by site-local date, where a day without visits is an
 * empty array; table reports are arrays of rows with `label`; a report that
 * failed is `{result: "error", message}` in its slot. Percentages arrive as
 * strings ("30%").
 */

export const WINDOWS = [7, 14, 30] as const;
export type WindowDays = (typeof WINDOWS)[number];
export const DEFAULT_WINDOW: WindowDays = 7;
/** "Right now" = Live.getCounters over this many minutes. */
export const LIVE_MINUTES = 30;

export function parseWindow(value: string | null | undefined): WindowDays {
  const n = Number(value);
  return (WINDOWS as readonly number[]).includes(n) ? (n as WindowDays) : DEFAULT_WINDOW;
}

export interface DayPoint {
  /** Site-local date, YYYY-MM-DD; "today" for the live day read. */
  date: string;
  visits: number;
  uniqVisitors: number;
  actions: number;
  /** Percent, 0-100. */
  bounceRate: number;
  /** Seconds. */
  avgTimeOnSite: number;
}
export interface Row {
  label: string;
  visits: number;
}
export interface PageRow {
  label: string;
  hits: number;
  visits: number;
}
export interface EventRow {
  category: string;
  action: string;
  events: number;
  visits: number;
}
/** A detail page (session or speaker) by its slug, from the page-URL report. */
export interface DetailRow {
  id: string;
  hits: number;
  visits: number;
}
/** Q&A opens per session, keyed by the Pretalx code the event carries (Meerkat's id). */
export interface QaRow {
  code: string;
  events: number;
  visits: number;
}
/** An event name that is a route path, a dataset id or a service, never personal data. */
export interface NameRow {
  name: string;
  events: number;
  visits: number;
}
/**
 * The failure events of the catalogue (data/analytics/track.ts), with the
 * three breakdowns whose names are safe to show: crash pages by route,
 * catalogue sync failures by dataset, Supabase proxy fallbacks by service.
 */
export interface HealthReport {
  failures: EventRow[];
  errorPages: NameRow[];
  syncFailures: NameRow[];
  proxyServices: NameRow[];
}
/** The flattened "category - action" labels that mean something went wrong. */
export const FAILURE_PATTERN =
  "^(error - page|sync - bundle-failed|network - .*|sign-in - (code|verify)-failed|feedback - failed|sw - update-slow)$";

export interface AnalyticsReport {
  windowDays: number;
  site: { name: string; timezone: string };
  live: { visitors: number; actions: number; minutes: number };
  today: DayPoint | null;
  days: DayPoint[];
  totals: {
    visits: number;
    /** 0 when Matomo does not compute uniques for ranges (its default). */
    uniqVisitors: number;
    actions: number;
    newVisits: number;
    returningVisits: number;
    bounceRate: number;
    avgTimeOnSite: number;
  };
  pages: PageRow[];
  events: EventRow[];
  devices: { types: Row[]; os: Row[]; browsers: Row[] };
  dimensions: { displayMode: Row[]; signedIn: Row[]; stars: Row[] };
  countries: Row[];
  referrers: Row[];
  /** Session detail pages (/schedule/<id>), most viewed first. */
  sessions: DetailRow[];
  /** Speaker detail pages (/speakers/<id>), most viewed first. */
  speakers: DetailRow[];
  /** "session - qa" events by session code, most opened first. */
  qa: QaRow[];
  health: HealthReport;
  /** Reports that failed on Matomo's side, by name, with its message. */
  warnings: string[];
}

type Query = Record<string, string>;

/** The bulk request, in this order; shapeReport reads the answer by index. */
export function bulkQueries(siteId: string, days: WindowDays): Query[] {
  const range = { period: "range", date: `last${days}` };
  const q = (method: string, params: Query = {}): Query => ({ method, idSite: siteId, ...params });
  return [
    q("VisitsSummary.get", { period: "day", date: `last${days}` }), // 0 daily series
    q("VisitsSummary.get", { period: "day", date: "today" }), // 1 today so far
    q("Live.getCounters", { lastMinutes: String(LIVE_MINUTES) }), // 2 right now
    q("VisitsSummary.get", range), // 3 window totals
    q("VisitFrequency.get", range), // 4 new vs returning
    q("Actions.getPageUrls", { ...range, flat: "1", filter_limit: "15", filter_sort_column: "nb_hits" }), // 5
    // 100 rows, not the 60 of the first cut: the page's install and sign-in
    // funnels read their steps from this list, and a rare step (prompt
    // accepted, verified) sorted past the cut would read as zero.
    q("Events.getCategory", { ...range, flat: "1", secondaryDimension: "eventAction", filter_limit: "100", filter_sort_column: "nb_events" }), // 6
    q("DevicesDetection.getType", { ...range, filter_limit: "6" }), // 7
    q("DevicesDetection.getOsFamilies", { ...range, filter_limit: "6" }), // 8
    q("DevicesDetection.getBrowsers", { ...range, filter_limit: "6" }), // 9
    q("CustomDimensions.getCustomDimension", { ...range, idDimension: String(DIMENSION.displayMode) }), // 10
    q("CustomDimensions.getCustomDimension", { ...range, idDimension: String(DIMENSION.signedIn) }), // 11
    q("CustomDimensions.getCustomDimension", { ...range, idDimension: String(DIMENSION.stars) }), // 12
    q("UserCountry.getCountry", { ...range, filter_limit: "8" }), // 13
    q("Referrers.getReferrerType", range), // 14
    q("SitesManager.getSiteFromId"), // 15 name + timezone
    // Detail pages are real paths (routing/viewParams detailHref), so a
    // regex on the page URL picks them out of the page report.
    q("Actions.getPageUrls", { ...range, flat: "1", filter_limit: "12", filter_sort_column: "nb_hits", filter_pattern: "^/schedule/." }), // 16 sessions
    q("Actions.getPageUrls", { ...range, flat: "1", filter_limit: "12", filter_sort_column: "nb_hits", filter_pattern: "^/speakers/." }), // 17 speakers
    q("Events.getAction", { ...range, flat: "1", secondaryDimension: "eventName", filter_limit: "12", filter_sort_column: "nb_events", filter_pattern: "^qa - " }), // 18 Q&A opens
    // Health: the failure events and the breakdowns whose names are routes,
    // dataset ids or services (the catalogue never sends personal data).
    q("Events.getCategory", { ...range, flat: "1", secondaryDimension: "eventAction", filter_limit: "20", filter_sort_column: "nb_events", filter_pattern: FAILURE_PATTERN }), // 19 failures
    q("Events.getAction", { ...range, flat: "1", secondaryDimension: "eventName", filter_limit: "10", filter_sort_column: "nb_events", filter_pattern: "^page - " }), // 20 crash pages by route
    q("Events.getAction", { ...range, flat: "1", secondaryDimension: "eventName", filter_limit: "10", filter_sort_column: "nb_events", filter_pattern: "^bundle-failed - " }), // 21 sync failures by dataset
    q("Events.getAction", { ...range, flat: "1", secondaryDimension: "eventName", filter_limit: "10", filter_sort_column: "nb_events", filter_pattern: "^supabase-proxy - " }), // 22 proxy fallbacks by service
  ];
}

type Dict = Record<string, unknown>;
const isDict = (v: unknown): v is Dict => typeof v === "object" && v !== null && !Array.isArray(v);

/** Numbers and numeric strings ("30%" reads 30); anything else is 0. */
function num(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function dayPoint(date: string, v: unknown): DayPoint {
  const d = isDict(v) ? v : {};
  return {
    date,
    visits: num(d.nb_visits),
    uniqVisitors: num(d.nb_uniq_visitors),
    actions: num(d.nb_actions),
    bounceRate: num(d.bounce_rate),
    avgTimeOnSite: num(d.avg_time_on_site),
  };
}

function rows(v: unknown): Row[] {
  return Array.isArray(v)
    ? v.filter(isDict).map((r) => ({ label: String(r.label ?? ""), visits: num(r.nb_visits) }))
    : [];
}

/** Page rows under one route prefix, reduced to the slug (query string and trailing slash dropped). */
function detailRows(v: unknown, prefix: string): DetailRow[] {
  if (!Array.isArray(v)) return [];
  const out: DetailRow[] = [];
  for (const r of v) {
    if (!isDict(r)) continue;
    const path = String(r.label ?? "").split("?")[0].replace(/\/+$/, "");
    if (!path.startsWith(prefix)) continue;
    let id = path.slice(prefix.length);
    try {
      id = decodeURIComponent(id);
    } catch {
      // keep the raw slug
    }
    if (id) out.push({ id, hits: num(r.nb_hits), visits: num(r.nb_visits) });
  }
  return out;
}

/** Flattened "<action> - <name>" event rows under one action, reduced to the name. */
function nameRows(v: unknown, prefix: string): NameRow[] {
  if (!Array.isArray(v)) return [];
  const out: NameRow[] = [];
  for (const r of v) {
    if (!isDict(r)) continue;
    const label = String(r.label ?? "");
    if (!label.startsWith(prefix)) continue;
    out.push({ name: label.slice(prefix.length), events: num(r.nb_events), visits: num(r.nb_visits) });
  }
  return out;
}

/** Flattened "category - action" event rows (the app's names never hold " - "). */
function eventRows(v: unknown): EventRow[] {
  if (!Array.isArray(v)) return [];
  return v.filter(isDict).map((r) => {
    const label = String(r.label ?? "");
    const cut = label.indexOf(" - ");
    return {
      category: cut < 0 ? label : label.slice(0, cut),
      action: cut < 0 ? "" : label.slice(cut + 3),
      events: num(r.nb_events),
      visits: num(r.nb_visits),
    };
  });
}

export function shapeReport(results: readonly unknown[], days: WindowDays): AnalyticsReport {
  const warnings: string[] = [];
  const pick = (index: number, what: string): unknown => {
    const v = results[index];
    if (isDict(v) && v.result === "error") {
      warnings.push(`${what}: ${String(v.message ?? "unknown error")}`);
      return undefined;
    }
    return v;
  };

  const series = pick(0, "daily series");
  const dayList = isDict(series)
    ? Object.entries(series)
        .map(([date, v]) => dayPoint(date, v))
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];
  const todayRaw = pick(1, "today");
  const today = isDict(todayRaw) ? dayPoint(dayList.at(-1)?.date ?? "today", todayRaw) : null;

  const liveRaw = pick(2, "right now");
  const live0 = Array.isArray(liveRaw) && isDict(liveRaw[0]) ? liveRaw[0] : {};
  const totalsRaw = pick(3, "totals");
  const td = isDict(totalsRaw) ? totalsRaw : {};
  const freqRaw = pick(4, "new vs returning");
  const fd = isDict(freqRaw) ? freqRaw : {};

  const pagesRaw = pick(5, "pages");
  const pages: PageRow[] = Array.isArray(pagesRaw)
    ? pagesRaw.filter(isDict).map((r) => ({ label: String(r.label ?? ""), hits: num(r.nb_hits), visits: num(r.nb_visits) }))
    : [];
  const events = eventRows(pick(6, "events"));

  const devices = { types: rows(pick(7, "device types")), os: rows(pick(8, "operating systems")), browsers: rows(pick(9, "browsers")) };
  const dimensions = { displayMode: rows(pick(10, "display mode")), signedIn: rows(pick(11, "signed in")), stars: rows(pick(12, "stars band")) };
  const countries = rows(pick(13, "countries"));
  const referrers = rows(pick(14, "referrers"));
  const siteRaw = pick(15, "site");
  const sd = isDict(siteRaw) ? siteRaw : {};
  const sessions = detailRows(pick(16, "session pages"), "/schedule/");
  const speakers = detailRows(pick(17, "speaker pages"), "/speakers/");
  const qa: QaRow[] = nameRows(pick(18, "Q&A opens"), "qa - ").map((r) => ({ code: r.name, events: r.events, visits: r.visits }));
  const health: HealthReport = {
    failures: eventRows(pick(19, "failure events")),
    errorPages: nameRows(pick(20, "crash pages"), "page - "),
    syncFailures: nameRows(pick(21, "sync failures"), "bundle-failed - "),
    proxyServices: nameRows(pick(22, "proxy fallbacks"), "supabase-proxy - "),
  };

  return {
    windowDays: days,
    site: { name: String(sd.name ?? ""), timezone: String(sd.timezone ?? "") },
    live: { visitors: num(live0.visitors), actions: num(live0.actions), minutes: LIVE_MINUTES },
    today,
    days: dayList,
    totals: {
      visits: num(td.nb_visits),
      uniqVisitors: num(td.nb_uniq_visitors),
      actions: num(td.nb_actions),
      newVisits: num(fd.nb_visits_new),
      returningVisits: num(fd.nb_visits_returning),
      bounceRate: num(td.bounce_rate),
      avgTimeOnSite: num(td.avg_time_on_site),
    },
    pages,
    events,
    devices,
    dimensions,
    countries,
    referrers,
    sessions,
    speakers,
    qa,
    health,
    warnings,
  };
}
