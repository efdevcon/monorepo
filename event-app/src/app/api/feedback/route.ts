import { NextResponse } from "next/server";
import { validateFeedbackPayload } from "@/data/feedback/validate";
import { createNotionFeedback, feedbackConfigured, signDownloads } from "./service";

export const dynamic = "force-dynamic";

/**
 * Creates one feedback row in Notion. Public on purpose: signed-out
 * attendees can report too. Files are referenced by the paths the upload
 * route handed out; nothing else is trusted from the body (see validate.ts).
 */
export async function POST(request: Request) {
  if (!feedbackConfigured()) {
    return NextResponse.json({ success: false, error: "Feedback is not configured" }, { status: 503 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = validateFeedbackPayload(body);
  if (!parsed.ok) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });

  try {
    const links = await signDownloads(parsed.value.files);
    const id = await createNotionFeedback(parsed.value, links);
    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    console.error("[/api/feedback] error:", err);
    return NextResponse.json({ success: false, error: "Couldn't send your feedback, please try again" }, { status: 502 });
  }
}
