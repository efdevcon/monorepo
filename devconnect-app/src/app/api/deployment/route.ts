import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Import DEPLOY_ID if available (generated during build)
  let DEPLOY_ID: string | undefined;
  try {
    const deployIdModule = await import('../../../deploy-id.js');
    DEPLOY_ID = deployIdModule.DEPLOY_ID;
  } catch {
    // File doesn't exist during development
  }

  // Support both Vercel and Netlify deployment IDs
  const deploymentId =
    DEPLOY_ID ||
    process.env.DEPLOY_ID ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    '';

  // Get the secret parameter from the URL
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  // Only return process.env if the secret parameter matches SECRET environment variable
  const response: { deploymentId: string; env?: NodeJS.ProcessEnv } = { deploymentId };

  if (secret === process.env.SECRET) {
    response.env = process.env;
  }

  return NextResponse.json(response);
}
