import { NextResponse } from "next/server";
import { validateUploadRequest } from "@/data/feedback/validate";
import { feedbackConfigured, newFilePath, signUpload } from "../service";

export const dynamic = "force-dynamic";

/**
 * Hands the browser a signed upload URL for one attachment, so the file goes
 * straight to the private bucket and never through a function body (Netlify
 * caps those at a few MB; screen recordings are bigger). The path is minted
 * here, so a report can only reference files uploaded this way.
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
  const parsed = validateUploadRequest(body);
  if (!parsed.ok) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });

  try {
    const path = newFilePath(parsed.value.name);
    const { token } = await signUpload(path);
    return NextResponse.json({ success: true, data: { path, token, name: parsed.value.name } });
  } catch (err) {
    console.error("[/api/feedback/upload] error:", err);
    return NextResponse.json({ success: false, error: "Couldn't prepare the upload" }, { status: 502 });
  }
}
