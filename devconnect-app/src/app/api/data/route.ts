import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

/**
 * API endpoint to fetch data
 * GET /api/data
 * 
 * Attempts to fetch from Notion database, falls back to sample data on error
 */
export async function GET(request: NextRequest) {
  try {
    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_SECRET,
    });

    const databaseId = '241638cdc415801e8174d12adcfb0d33';

    // Try to fetch from Notion first
    const response = await notion.databases.query({
      database_id: databaseId
    });

    // Transform Notion response to quest format
    const data = response.results.map((page: any) => {
      const properties = page.properties;

      // console.log(properties);

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
        } else if (property.type === 'formula') {
          // Handle different formula result types
          const formulaResult = property.formula;
          if (formulaResult) {
            if (formulaResult.type === 'string') {
              return formulaResult.string || '';
            } else if (formulaResult.type === 'number') {
              return formulaResult.number?.toString() || '';
            } else if (formulaResult.type === 'boolean') {
              return formulaResult.boolean ? 'true' : 'false';
            } else if (formulaResult.type === 'date') {
              return formulaResult.date?.start || '';
            }
          }
          return '';
        } else if (property.type === 'checkbox') {
          return property.checkbox ? 'true' : 'false';
        }
        return '';
      };

      return {
        name: getPropertyValue('Supporter Name'),
        district: getPropertyValue('District'),
        location: getPropertyValue('Location'),
        id: getPropertyValue('Layer naming'),
        isPOI: getPropertyValue('Is POI'),
      };
    });

    const supporters = data.filter(item => item.isPOI === 'false');
    const pois = data.filter(item => item.isPOI === 'true');

    // remove isPOI property from result
    const cleanSupporters = supporters.map(item => { delete item.isPOI; return item; });
    const cleanPois = pois.map(item => { delete item.isPOI; return item; });

    // Get unique districts and locations with IDs
    const uniqueDistricts = [...new Set(data.map(item => item.district).filter(Boolean))]
      .map((district, index) => ({ id: index + 1, name: district }));
    
    const uniqueLocations = [...new Set(data.map(item => item.location).filter(Boolean))]
      .map((location, index) => ({ id: index + 1, name: location }));

    // Create lookup maps for district and location IDs
    const districtMap = new Map(uniqueDistricts.map(d => [d.name, d.id]));
    const locationMap = new Map(uniqueLocations.map(l => [l.name, l.id]));

    // Replace district and location names with IDs in supporters and POIs
    const supportersWithIds = cleanSupporters.map(item => {
      const { district, location, ...rest } = item;
      return {
        ...rest,
        districtId: districtMap.get(district) || null,
        locationId: locationMap.get(location) || null,
      };
    });

    const poisWithIds = cleanPois.map(item => {
      const { district, location, ...rest } = item;
      return {
        ...rest,
        districtId: districtMap.get(district) || null,
        locationId: locationMap.get(location) || null,
      };
    });

    const result = {
      supporters: supportersWithIds,
      pois: poisWithIds,
      districts: uniqueDistricts,
      locations: uniqueLocations,
    };

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('Error returning data:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to return data',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
