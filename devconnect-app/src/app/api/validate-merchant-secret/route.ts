import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  // Check if the secret matches the environment variable
  const isValid = secret === process.env.SECRET;

  return NextResponse.json({ valid: isValid });
}

