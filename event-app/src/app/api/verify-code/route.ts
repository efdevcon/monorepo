import { NextRequest, NextResponse } from "next/server";
import { verifyCode } from "@/lib/verification";

export async function POST(request: NextRequest) {
  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { code } = body;
  if (!code || typeof code !== "string") {
    return NextResponse.json(
      { error: "code is required" },
      { status: 400 }
    );
  }

  const result = verifyCode(code);

  if (!result.valid) {
    return NextResponse.json(
      { valid: false, error: result.error },
      { status: 401 }
    );
  }

  return NextResponse.json({
    valid: true,
    userId: result.userId,
    sessionId: result.sessionId,
  });
}
