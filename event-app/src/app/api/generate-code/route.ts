import { NextRequest, NextResponse } from "next/server";
import { generateCode } from "@/lib/verification";

const MOCK_USER_ID = "mock-user-123";

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

  // Mocked: in production this would resolve the real userId from auth
  const userId = MOCK_USER_ID;
  const code = generateCode(userId, sessionId);

  return NextResponse.json({ code });
}
