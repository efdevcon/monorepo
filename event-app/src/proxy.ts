import { type NextRequest, NextResponse } from "next/server";
import { legacySessionRedirect } from "@/data/legacySessionLink";

/**
 * Runs for `/schedule/<six characters>` only (`config` below): the shape of a
 * Pretalx code, which is how the previous app addressed sessions
 * (`src/data/legacySessionLink.ts`). A known code is answered with a real 307
 * before any page renders. The route could not do that: a `redirect()` there
 * runs inside the layout's Suspense boundary, which Next turns into a 200
 * page carrying a one-second meta refresh; crawlers skip it and the service
 * worker would cache it. Unknown codes, and six-letter slugs that match the
 * matcher's case-insensitive pattern, pass straight through to the page.
 */
export default async function proxy(request: NextRequest) {
  const code = request.nextUrl.pathname.split("/")[2] ?? "";
  const target = await legacySessionRedirect(code);
  if (!target) return NextResponse.next();
  return NextResponse.redirect(new URL(target, request.url), 307);
}

export const config = {
  matcher: ["/schedule/:code([A-Za-z0-9]{6})"],
};
