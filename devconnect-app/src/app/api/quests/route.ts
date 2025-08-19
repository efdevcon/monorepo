import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

/**
 * API endpoint to fetch quest data
 * GET /api/quests
 * 
 * Attempts to fetch from Notion database, falls back to sample data on error
 */
export async function GET(request: NextRequest) {
  try {
    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_SECRET,
    });

    const databaseId = '24c638cdc41580e5bc31f643e4eaeff3';

    // Try to fetch from Notion first
    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [
        {
          property: 'Order',
          direction: 'ascending',
        },
      ],
    });

    // Transform Notion response to quest format
    const quests = response.results.map((page: any) => {
      const properties = page.properties;
      
      return {
        name: properties.Name?.title?.[0]?.plain_text || '',
        order: properties.Order?.number || 0,
        points: properties.Points?.number || 0,
        category: properties.Category?.select?.name || '',
        group: properties.Group?.select?.name || '',
        difficulty: properties.Difficulty?.select?.name || '',
        instructions: properties.Instructions?.rich_text?.[0]?.plain_text || '',
        action: properties.Action?.select?.name || '',
        button: properties.Button?.rich_text?.[0]?.plain_text || '',
        conditionType: properties['Condition type']?.select?.name || '',
        conditionValues: properties['Condition values']?.rich_text?.[0]?.plain_text || '',
        id: properties.ID?.unique_id?.prefix + properties.ID?.unique_id?.number || '',
        logoLink: properties['Logo Link']?.files?.[0]?.file?.url || properties['Logo Link']?.files?.[0]?.external?.url || '',
        poapImageLink: properties['POAP image link']?.files?.[0]?.file?.url || properties['POAP image link']?.files?.[0]?.external?.url || '',
        position: properties.Position?.rich_text?.[0]?.plain_text || '',
      };
    });

    return NextResponse.json({
      success: true,
      quests,
      total: quests.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('Error returning quest data:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to return quest data',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
