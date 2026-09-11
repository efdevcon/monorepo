import { NextRequest, NextResponse } from "next/server";
import { clientIp, requireUser } from "../auth";
import { addLink, linksConfigured, removeLink } from "../links";
import { ticketsPayload } from "../payload";
import {
  attachRejection,
  getPaidTicketsByEmail,
  getPositionBySecret,
  getStoreFromEnv,
  loadCatalog,
} from "../pretix";
import { createRateLimiter } from "../rateLimit";

/**
 * Attach a ticket the account holds. Two proofs:
 * - `{ positionId }`: choosing among the tickets already matched by the
 *   session email ("Which ticket is yours?"). The email match is the proof, so
 *   the position only has to be one of those.
 * - `{ code }`: the QR decoded from a screenshot, for a ticket not under this
 *   email. Verified against Pretix (this event, paid order, live admission
 *   position). Never log the code: it is the QR at the door.
 * Either way the link is recorded and the refreshed tickets come back.
 */

/** Pretix position secrets are alphanumeric; anything else is not worth a lookup. */
const CODE_SHAPE = /^[A-Za-z0-9_-]{8,256}$/;
const INVALID = "This isn't a valid Devcon ticket";
const TOO_MANY = "Too many attempts, try again in a few minutes";
const UNAVAILABLE = "Ticket attach is not available right now";

const WINDOW_MS = 10 * 60_000;
const perUser = createRateLimiter(10, WINDOW_MS);
const perIp = createRateLimiter(40, WINDOW_MS);

const fail = (error: string, status: number) =>
  NextResponse.json({ success: false, error }, { status });

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) return fail("Invalid or expired session", 401);
    const store = getStoreFromEnv();
    if (!store || !linksConfigured()) return fail(UNAVAILABLE, 503);
    if (!perUser.allow(user.id) || !perIp.allow(clientIp(request))) {
      return fail(TOO_MANY, 429);
    }

    const body = await request.json().catch(() => null);

    // Any non-zero integer: fixture tickets carry negative ids in dev, and the
    // ownership check below decides either way.
    const positionId = Number(body?.positionId);
    if (Number.isInteger(positionId) && positionId !== 0) {
      const mine = (await getPaidTicketsByEmail(user.email, store))
        .flatMap((order) => order.tickets)
        .find((ticket) => ticket.positionId === positionId && ticket.admission !== false);
      if (!mine) return fail(INVALID, 422);
      await addLink(user.id, store.eventSlug, positionId, mine.secret, "email");
      return NextResponse.json(
        { success: true, data: await ticketsPayload(user, store) },
        { status: 201 }
      );
    }

    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!CODE_SHAPE.test(code)) return fail(INVALID, 400);

    const found = await getPositionBySecret(code, store);
    if (!found) return fail(INVALID, 422);
    const rejection = attachRejection(found.position, found.order, await loadCatalog(store));
    if (rejection) return fail(rejection, 422);

    await addLink(user.id, store.eventSlug, found.position.id, code, "qr");
    return NextResponse.json(
      { success: true, data: await ticketsPayload(user, store) },
      { status: 201 }
    );
  } catch (err) {
    console.error("[/api/tickets/attach] POST error:", err);
    return fail("Couldn't attach the ticket, try again", 500);
  }
}

/** Detach ("Wrong ticket?"): drop the link, return the remaining tickets. */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) return fail("Invalid or expired session", 401);
    const store = getStoreFromEnv();
    if (!store || !linksConfigured()) return fail(UNAVAILABLE, 503);

    const body = await request.json().catch(() => null);
    const positionId = Number(body?.positionId);
    if (!Number.isInteger(positionId) || positionId === 0) {
      return fail("Invalid ticket", 400);
    }

    await removeLink(user.id, store.eventSlug, positionId);
    return NextResponse.json({ success: true, data: await ticketsPayload(user, store) });
  } catch (err) {
    console.error("[/api/tickets/attach] DELETE error:", err);
    return fail("Couldn't remove the ticket, try again", 500);
  }
}
