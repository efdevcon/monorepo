import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

/**
 * API endpoint to fetch quest data
 * GET /api/quests
 * 
 * Attempts to fetch from Notion database, falls back to sample data on error
 */

// GraphQL query to fetch POAP images from POAP API
async function fetchPOAPImages(poapIds: string[]): Promise<Record<string, string>> {
  if (poapIds.length === 0) return {};

  const query = `
    query GetPOAPImages($ids: [Int!]!) {
      drops(where: {id: {_in: $ids}}) {
        id
        image_url
      }
    }
  `;

  try {
    const response = await fetch('https://public.compass.poap.tech/v1/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          ids: poapIds.map(id => parseInt(id)).filter(id => !isNaN(id))
        }
      })
    });

    if (!response.ok) {
      console.error('Failed to fetch POAP images:', response.status, response.statusText);
      return {};
    }

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return {};
    }

    // Create a mapping from POAP ID to image URL
    const imageMap: Record<string, string> = {};
    if (data.data?.drops) {
      data.data.drops.forEach((drop: any) => {
        imageMap[drop.id.toString()] = drop.image_url + '?size=large';
      });
    }

    return imageMap;
  } catch (error) {
    console.error('Error fetching POAP images:', error);
    return {};
  }
}
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
          property: 'ID',
          direction: 'ascending',
        },
      ],
    });

    // Transform Notion response to quest format
    const quests = response.results.map((page: any) => {
      const properties = page.properties;

      // console.log(properties);
      // console.log(properties['Supporter']);

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
      // const category = getPropertyValue('District')?.replace(/[0-9]\. /, '').toLowerCase();
      // const name = getPropertyValue('Name')?.toLowerCase().replace(/\s+/g, '-');

      const conditionType = getPropertyValue('Condition type');
      const conditionValues = getPropertyValue('Quest condition values');

      // Extract POAP ID from conditionValues if conditionType is verifyPoap
      const poapId = conditionType === 'verifyPoap' ? conditionValues : undefined;

      return {
        id: getPropertyValue('ID'),
        name: getPropertyValue('Quest name'),
        order: getPropertyValue('Order'),
        instructions: getPropertyValue('Quest instructions'),
        action: getPropertyValue('Action'),
        button: getPropertyValue('Button'),
        group: getPropertyValue('Group'),
        conditionType,
        conditionValues,
        supporterId: getPropertyValue('Supporter'),
        poapImageLink: "",
        poapId,
      };
    });

    // Collect all POAP IDs from quests that have them
    const poapIds = quests
      .filter(quest => quest.poapId)
      .map(quest => quest.poapId!);

    // Fetch POAP images in batch
    const poapImageMap = await fetchPOAPImages(poapIds);

    // Update quests with fetched POAP images
    const questsWithImages = quests.map(quest => {
      if (quest.poapId && poapImageMap[quest.poapId]) {
        const { poapId, ...questWithoutPoapId } = quest;
        return {
          ...questWithoutPoapId,
          poapImageLink: poapImageMap[quest.poapId]
        };
      }
      const { poapId, ...questWithoutPoapId } = quest;
      return questWithoutPoapId;
    });

    // Sort quests by ID as a backup to ensure consistent ordering
    const sortedQuests = questsWithImages.sort((a, b) => {
      const idA = parseInt(a.id) || 0;
      const idB = parseInt(b.id) || 0;
      return idA - idB;
    });

    return NextResponse.json({
      success: true,
      quests: sortedQuests,
      total: sortedQuests.length,
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
