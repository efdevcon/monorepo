import { NextRequest, NextResponse } from "next/server";
import { generateHandoverToken } from "./verification";

const MOCK_EMAIL = "mockuser@example.com";

export async function POST() {
  // TODO: resolve real email from authenticated user session + verify ticket ownership
  const email = MOCK_EMAIL;
  const token = generateHandoverToken(email);

  return NextResponse.json({ token });
}
