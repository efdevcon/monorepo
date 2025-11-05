import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

/**
 * API endpoint to fetch data
 * GET /api/data
 *
 * Attempts to fetch from Notion database, falls back to sample data on error
 * POI field is now a select type indicating the type of POI (previously was boolean isPOI)
 */
export async function GET(request: NextRequest) {
  try {
    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_SECRET,
    });

    const databaseId = '241638cdc415801e8174d12adcfb0d33';

    // Try to fetch from Notion first with pagination to get all results
    let allResults: any[] = [];
    let hasMore = true;
    let startCursor: string | undefined = undefined;

    while (hasMore) {
      const response = await notion.databases.query({
        database_id: databaseId,
        start_cursor: startCursor,
        page_size: 100 // Maximum page size
      });

      allResults = allResults.concat(response.results);
      hasMore = response.has_more;
      startCursor = response.next_cursor || undefined;

      console.log(`Fetched ${response.results.length} items, total: ${allResults.length}, hasMore: ${hasMore}`);
    }

    const data = allResults.map((page: any) => {
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
        } else if (property.type === 'relation') {
          // Extract the first relation ID and remove hyphens
          const relationId = property.relation?.[0]?.id;
          return relationId ? relationId.replaceAll('-', '') : '';
        }
        return '';
      };

      const result = {
        name: getPropertyValue('Name'),
        district: getPropertyValue('District'),
        location: getPropertyValue('Location'),
        layerName: getPropertyValue('Layer name') || getPropertyValue('Suggested layer name'),
        POI: getPropertyValue('POI'),
        id: page.id?.replaceAll('-', ''),
        logo: getPropertyValue('Logo'),
        largeLogo: getPropertyValue('Large logo'),
        description: getPropertyValue('Project description'),
        group: getPropertyValue('POI'),
        websiteLink: getPropertyValue('Website link'),
        twitterLink: getPropertyValue('Twitter link'),
        farcasterLink: getPropertyValue('Farcaster link'),
      };

      if (!result.group)
        delete result.group;

      return result;
    });


    console.log(`Total items processed: ${data.length}`);
    // Filter out entries with empty Supporter Name
    const filteredData = data.filter(item => item.name && item.name.trim() !== '');

    const supporters = filteredData.filter(item => !item.POI || item.POI.trim() === '');
    const pois = filteredData.filter(item => item.POI && item.POI.trim() !== '');

    // remove POI property from result (was previously isPOI boolean)
    const cleanSupporters = supporters.map(item => { delete item.POI; return item; });
    const cleanPois = pois.map(item => { delete item.POI; return item; });

    // Get unique districts, locations, and POI groups as objects with numeric ID as key
    const uniqueDistrictsArray = [...new Set(filteredData.map(item => item.district).filter(Boolean))].sort();
    const uniqueDistricts = uniqueDistrictsArray.reduce((acc, district, index) => {
      acc[(index + 1).toString()] = { name: district };
      return acc;
    }, {} as Record<string, { name: string }>);

    const uniqueLocationsArray = [...new Set(filteredData.map(item => item.location).filter(Boolean))].sort();
    const uniqueLocations = uniqueLocationsArray.reduce((acc, location, index) => {
      acc[(index + 1).toString()] = { name: location };
      return acc;
    }, {} as Record<string, { name: string }>);

    const uniquePoiGroupsArray = [...new Set(pois.map(item => item.group).filter(Boolean))].sort();
    const uniquePoiGroups = uniquePoiGroupsArray.reduce((acc, group, index) => {
      acc[(index + 1).toString()] = { name: group };
      return acc;
    }, {} as Record<string, { name: string }>);

    // Create lookup maps for district, location, and POI group (name -> numeric ID)
    const districtMap = new Map(uniqueDistrictsArray.map((name, index) => [name, (index + 1).toString()]));
    const locationMap = new Map(uniqueLocationsArray.map((name, index) => [name, (index + 1).toString()]));
    const poiGroupMap = new Map(uniquePoiGroupsArray.map((name, index) => [name, (index + 1).toString()]));

    // Replace district and location names with their numeric IDs in supporters and POIs
    const supportersWithIds = cleanSupporters.map(item => {
      const { district, location, ...rest } = item;
      return {
        ...rest,
        districtId: districtMap.get(district) || null,
        locationId: locationMap.get(location) || null,
      };
    });

    const poisWithIds = cleanPois.map(item => {
      const { district, location, group, largeLogo, ...rest } = item;
      delete rest.id;
      return {
        ...rest,
        districtId: districtMap.get(district) || null,
        locationId: locationMap.get(location) || null,
        groupId: poiGroupMap.get(group) || null,
      };
    }).sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    });

    // Sort supporters by name before converting to object
    const sortedSupporters = supportersWithIds.sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    });

    // Convert supporters array to object with id as key, removing id from individual objects
    const supportersObject = sortedSupporters.reduce((acc, supporter) => {
      if (supporter.id) {
        const { id, ...supporterWithoutId } = supporter;
        acc[id] = supporterWithoutId;
      }
      return acc;
    }, {} as Record<string, any>);

    const result = {
      supporters: supportersObject,
      pois: poisWithIds,
      districts: uniqueDistricts,
      locations: uniqueLocations,
      poiGroups: uniquePoiGroups,
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
