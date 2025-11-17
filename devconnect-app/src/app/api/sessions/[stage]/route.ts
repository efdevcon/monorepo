import { NextResponse } from 'next/server';

// Route segment config - caches all fetch requests in this route for 5 minutes
export const revalidate = 300;

export async function GET(
  request: Request,
  { params }: { params: { stage: string } }
) {
  const { stage } = await params;

  console.log(stage, 'stage');

  try {
    // Fetch will be cached according to route revalidate config above
    const response = await fetch(
      `https://devconnect.pblvrt.com/sessions?stage=${stage}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        // CDN/Edge caching: cache for 5 min, serve stale for 5 min while revalidating
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('[Sessions API] Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
