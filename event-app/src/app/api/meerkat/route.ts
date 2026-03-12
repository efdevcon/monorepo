import { NextRequest, NextResponse } from "next/server";
import { generateHandoverToken } from "./verification";

const MOCK_EMAIL = "mockuser@example.com";

export async function POST(request: NextRequest) {
  let body: { sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { sessionId } = body;
  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 }
    );
  }

  // TODO: resolve real email from authenticated user session + verify ticket ownership
  const email = MOCK_EMAIL;
  const token = generateHandoverToken(email, sessionId);

  return NextResponse.json({ token });
}
