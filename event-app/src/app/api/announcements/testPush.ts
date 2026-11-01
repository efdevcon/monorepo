/**
 * Test sends from Notion: a rehearsal of an announcement on a small audience
 * before it goes to everyone. Two checkboxes on the announcements DB, one per
 * audience: "Test push (team)" reaches every device signed in with a team
 * address (`is_team` on the subscription), "Test push (product team)" only
 * the accounts listed in the PUSH_PRODUCT_TEAM_EMAILS env var. A test keeps its own send state per
 * audience (table `devcon8_announcement_tests`), so it never consumes the
 * row's one real send. It ignores Visible (a hidden draft can be rehearsed)
 * but waits for Send At like the real push (`testPushDue`, 2026-11-01): a
 * row dated next week rehearses next week, a past date goes within a minute.
 *
 * The state follows the checkbox EDGE, not its level. A box going from
 * unticked to ticked arms the test (`scheduled`); a box that stays ticked
 * sends once; unticking cancels a test that has not started and leaves a
 * running or finished one alone. "Untick, publish, tick, publish" runs a
 * test again. Pure, shared by the Notion sync, the dispatcher and
 * `data:test`.
 */
export type TestAudience = "team" | "product";
export type TestPushStatus = "draft" | "scheduled" | "sending" | "sent";

/** The Notion checkbox property per audience. */
export const TEST_AUDIENCES: Record<TestAudience, { property: string; label: string }> = {
  team: { property: "Test push (team)", label: "team" },
  product: { property: "Test push (product team)", label: "product team" },
};
export const TEST_AUDIENCE_KEYS = Object.keys(TEST_AUDIENCES) as TestAudience[];

/**
 * The product-team audience: the accounts in the PUSH_PRODUCT_TEAM_EMAILS
 * env var (comma-separated, matched case-insensitively against the auth
 * email through the `devcon8_push_subscriptions_for_emails` RPC). An env
 * var rather than a constant so no address lives in this public repo; an
 * unset or empty list means a product-team test reaches nobody.
 */
export const PRODUCT_TEAM_EMAILS_ENV = "PUSH_PRODUCT_TEAM_EMAILS";

/** Lower-cased, trimmed, de-duplicated addresses from a comma-separated list. */
export function parseEmailList(value: string | undefined): string[] {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(/[,\s]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes("@"))
    ),
  ];
}

export function productTeamEmails(
  env: Record<string, string | undefined> = process.env
): string[] {
  return parseEmailList(env[PRODUCT_TEAM_EMAILS_ENV]);
}

/** So a test is never mistaken for the real thing on a team phone. */
/**
 * Whether an armed test may leave: its row's Send At has been reached, the
 * same rule as the real send. An unreadable date never is, so a broken row
 * waits instead of going out.
 */
export function testPushDue(sendAt: string, nowMs: number): boolean {
  const at = Date.parse(sendAt);
  return Number.isFinite(at) && at <= nowMs;
}

export const TEST_TITLE_PREFIX = "Test: ";

export function testPushTitle(title: string): string {
  return `${TEST_TITLE_PREFIX}${title}`;
}

/** One audience's row in `devcon8_announcement_tests`, as last synced. */
export interface TestPushState {
  status: TestPushStatus;
  flag: boolean;
}

/** Next status for one audience, given the stored row and the box as Notion has it now. */
export function nextTestStatus(
  current: TestPushState | undefined,
  ticked: boolean
): TestPushStatus {
  const was = current ?? { status: "draft" as const, flag: false };
  if (ticked) return was.flag ? was.status : "scheduled";
  return was.status === "scheduled" ? "draft" : was.status;
}

/** The two checkboxes of a Notion page, by audience (a missing property reads as unticked). */
export function notionTestFlags(
  properties: Record<string, { checkbox?: boolean } | undefined>
): Record<TestAudience, boolean> {
  const flags = {} as Record<TestAudience, boolean>;
  for (const audience of TEST_AUDIENCE_KEYS) {
    flags[audience] = properties[TEST_AUDIENCES[audience].property]?.checkbox ?? false;
  }
  return flags;
}
