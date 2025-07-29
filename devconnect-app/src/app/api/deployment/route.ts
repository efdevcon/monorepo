import { NextResponse } from 'next/server';

export async function GET() {
  // Support both Vercel and Netlify deployment IDs
  const deploymentId =
    process.env.DEPLOY_ID ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    '';

  return NextResponse.json({ deploymentId });
}
