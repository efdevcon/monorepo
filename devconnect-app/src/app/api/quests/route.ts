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

      // console.log(properties);
      console.log(properties['Supporter']);

      // Helper function to get property value, trying both clean and prefixed names
      const getPropertyValue = (propertyName: string, fallbackName?: string) => {
        // Try the clean name first, then look for prefixed versions
        let property = properties[propertyName as keyof typeof properties];

        if (!property && fallbackName) {
          property = properties[fallbackName as keyof typeof properties];
        }

        // If still not found, try to find a prefixed version
        if (!property) {
          const prefixedKeys = Object.keys(properties).filter(key =>
            key.includes(propertyName) || (fallbackName && key.includes(fallbackName))
          );
          if (prefixedKeys.length > 0) {
            property = properties[prefixedKeys[0] as keyof typeof properties];
          }
        }

        if (!property) return '';

        if (property.type === 'title') {
          return property.title?.[0]?.plain_text || '';
        } else if (property.type === 'rich_text') {
          return property.rich_text?.[0]?.plain_text || '';
        } else if (property.type === 'select') {
          return property.select?.name || '';
        } else if (property.type === 'number') {
          return property.number || 0;
        } else if (property.type === 'url') {
          return property.url || '';
        } else if (property.type === 'files') {
          return property.files?.[0]?.file?.url || property.files?.[0]?.external?.url || '';
        } else if (property.type === 'unique_id') {
          return property.unique_id?.prefix + property.unique_id?.number || '';
        } else if (property.type === 'relation') {
          // Extract the first relation ID and remove hyphens
          const relationId = property.relation?.[0]?.id;
          return relationId ? relationId.replaceAll('-', '') : '';
        }
        return '';
      };

      // remove 1., 2., 3. from category
      const category = getPropertyValue('District')?.replace(/[0-9]\. /, '').toLowerCase();
      const name = getPropertyValue('Name')?.toLowerCase().replace(/\s+/g, '-');

      return {
        id: getPropertyValue('ID'),
        name: getPropertyValue('Quest name'),
        order: getPropertyValue('Order'),
        points: getPropertyValue('Points'),
        difficulty: getPropertyValue('Difficulty'),
        instructions: getPropertyValue('Quest instructions'),
        action: getPropertyValue('Action'),
        button: getPropertyValue('Button'),
        group: getPropertyValue('Group'),
        conditionType: getPropertyValue('Condition type'),
        conditionValues: getPropertyValue('Quest condition values'),
        supporterId: getPropertyValue('Supporter'),
        poapImageLink: getPropertyValue('POAP image'),
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
