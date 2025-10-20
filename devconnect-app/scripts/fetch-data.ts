#!/usr/bin/env tsx

/**
 * Script to fetch data from the /api/data endpoint and save it to the data folder
 * 
 * Usage:
 *   pnpm run fetch-data
 *   or
 *   pnpm exec tsx scripts/fetch-data.ts
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ApiResponse, ApiErrorResponse } from '../src/types';
import { Client } from '@notionhq/client';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') });

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Verify required environment variables for image processing
function verifyEnvironmentForImageProcessing(): boolean {
  return !!process.env.NOTION_SECRET;
}

// Define the base URL for the API
const API_BASE_URL = 'https://devconnect.org';
const API_ENDPOINT = `http://localhost:3000/api/data`;

// Define output paths
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const SUPPORTERS_FILE = path.join(DATA_DIR, 'supporters.ts');
const POIS_FILE = path.join(DATA_DIR, 'pois.ts');
const DISTRICTS_FILE = path.join(DATA_DIR, 'districts.ts');
const LOCATIONS_FILE = path.join(DATA_DIR, 'locations.ts');
const POI_GROUPS_FILE = path.join(DATA_DIR, 'poiGroups.ts');
const FULL_DATA_FILE = path.join(DATA_DIR, 'api-data.json');

// Using the imported ApiResponse type from ../src/types

/**
 * Check if a URL is a Notion-hosted temporary image URL
 */
function isNotionTemporaryUrl(url: string): boolean {
  return url.includes('X-Amz-Security-Token');
}

/**
 * Download an image from a URL and convert to base64
 */
async function downloadImageAsBase64(url: string): Promise<{ base64: string; contentType: string; fileName: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const base64 = `data:${response.headers.get('content-type')};base64,${Buffer.from(buffer).toString('base64')}`;

  // Extract filename from URL or generate one
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/');
  const originalFileName = pathParts[pathParts.length - 1].split('?')[0];
  const fileName = originalFileName || `image-${Date.now()}.png`;

  return {
    base64,
    contentType: response.headers.get('content-type') || 'image/png',
    fileName
  };
}

/**
 * Upload image to Supabase via the upload API
 */
async function uploadToSupabase(base64: string, fileName: string, contentType: string): Promise<string> {
  const uploadUrl = `${API_BASE_URL}/api/upload`;

  console.log(`  📤 Uploading to Supabase: ${fileName}`);

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file: base64,
      fileName,
      contentType
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload failed: ${error}`);
  }

  const result = await response.json();
  console.log(`  ✅ Uploaded to: ${result.url}`);
  return result.url;
}

/**
 * Update Notion page with new image URL
 */
async function updateNotionImage(pageId: string, password: string, fieldName: string, newUrl: string): Promise<void> {
  const notionUrl = `${API_BASE_URL}/api/notion/${pageId}-${password}`;

  console.log(`  📝 Updating Notion page ${pageId.substring(0, 8)}... with new URL: ${newUrl}`);

  const response = await fetch(notionUrl, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      [fieldName]: newUrl
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion update failed: ${error}`);
  }
}

/**
 * Get password for a Notion page
 */
async function getNotionPagePassword(pageId: string): Promise<string | null> {
  const notion = new Client({ auth: process.env.NOTION_SECRET });
  try {
    const page = await notion.pages.retrieve({ page_id: pageId }) as any;
    const formPassword = page.properties?.["Form password"];

    if (!formPassword) {
      return null;
    }

    if (formPassword.type === 'rich_text') {
      return formPassword.rich_text?.[0]?.plain_text || null;
    } else if (formPassword.type === 'formula') {
      const formulaResult = formPassword.formula;
      if (formulaResult && formulaResult.type === 'number') {
        return formulaResult.number?.toString() || null;
      }
    }

    return null;
  } catch (error) {
    console.error(`Failed to fetch password for page ${pageId}:`, error);
    return null;
  }
}

/**
 * Process a single Notion temporary URL: download, upload, and update
 */
async function processNotionImage(url: string, pageId: string, password: string, fieldName: string): Promise<string> {
  try {
    console.log(`\n  🔄 Processing Notion temporary URL for field "${fieldName}"...`);
    console.log(`  📄 Page ID: ${pageId}`);

    // Download image
    console.log(`  ⬇️  Downloading image...`);
    const { base64, contentType, fileName } = await downloadImageAsBase64(url);
    console.log(`  ✅ Downloaded: ${fileName} (${contentType})`);

    // Upload to Supabase
    const newUrl = await uploadToSupabase(base64, fileName, contentType);
    console.log(`  ✅ Uploaded to: ${newUrl}`);

    // Update Notion
    await updateNotionImage(pageId, password, fieldName, newUrl);
    console.log(`  ✅ Notion updated successfully`);

    return newUrl;
  } catch (error) {
    console.error(`  ❌ Failed to process image:`, error);
    throw error;
  }
}

/**
 * Get page ID from POI by name (need to query Notion to find it)
 */
async function getPoiPageId(poiName: string): Promise<string | null> {
  const notion = new Client({ auth: process.env.NOTION_SECRET });
  const databaseId = '241638cdc415801e8174d12adcfb0d33';

  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Name',
        title: {
          equals: poiName
        }
      }
    });

    if (response.results.length > 0) {
      return response.results[0].id;
    }

    return null;
  } catch (error) {
    console.error(`Failed to find POI page ID for ${poiName}:`, error);
    return null;
  }
}

/**
 * Process all Notion temporary images found in the data
 */
async function processAllNotionImages(data: ApiResponse): Promise<number> {
  if (!data.success || !data.data) {
    return 0;
  }

  const { supporters, pois } = data.data;
  let processedCount = 0;

  console.log(`\n📸 Processing Notion temporary images...`);

  // First, check supporters
  for (const [supporterId, supporter] of Object.entries(supporters)) {
    if (supporter.logo && isNotionTemporaryUrl(supporter.logo)) {
      console.log(`\n🎯 [${processedCount + 1}] Found Notion temporary URL in supporter: ${supporter.name}`);
      console.log(`   Supporter ID: ${supporterId}`);

      try {
        // Get the full page ID with hyphens
        const pageId = supporterId.match(/.{1,8}/g)?.join('-') || supporterId;

        // Fetch password from Notion
        console.log(`   🔑 Fetching password...`);
        const password = await getNotionPagePassword(pageId);

        if (!password) {
          console.error(`   ❌ Could not fetch password - skipping`);
          continue;
        }

        // Process the image
        const newUrl = await processNotionImage(supporter.logo, pageId, password, 'Logo');
        processedCount++;
        console.log(`   ✅ Successfully processed! New URL: ${newUrl.substring(0, 80)}...`);
      } catch (error) {
        console.error(`   ❌ Failed to process: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  // Then, check POIs
  for (const poi of pois) {
    if (poi.logo && isNotionTemporaryUrl(poi.logo)) {
      console.log(`\n🎯 [${processedCount + 1}] Found Notion temporary URL in POI: ${poi.name}`);

      try {
        // Get the page ID from Notion by querying with the POI name
        console.log(`   🔍 Finding page ID...`);
        const pageId = await getPoiPageId(poi.name);

        if (!pageId) {
          console.error(`   ❌ Could not find page ID - skipping`);
          continue;
        }

        // Fetch password from Notion
        console.log(`   🔑 Fetching password...`);
        const password = await getNotionPagePassword(pageId);

        if (!password) {
          console.error(`   ❌ Could not fetch password - skipping`);
          continue;
        }

        // Process the image
        const newUrl = await processNotionImage(poi.logo, pageId, password, 'Logo');
        processedCount++;
        console.log(`   ✅ Successfully processed! New URL: ${newUrl.substring(0, 80)}...`);
      } catch (error) {
        console.error(`   ❌ Failed to process: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  if (processedCount === 0) {
    console.log(`\n  ℹ️  No Notion temporary URLs found in data.`);
  } else {
    console.log(`\n✨ Successfully processed ${processedCount} image(s)!`);
  }

  return processedCount;
}

/**
 * Check for Notion temporary URLs in an object and log warnings
 */
function checkForNotionUrls(data: Record<string, any> | any[], dataType: string): void {
  let foundNotionUrls = 0;
  const entries = Array.isArray(data) ? data : Object.values(data);

  entries.forEach((item: any, index: number) => {
    const itemId = item.id || item.name || index;

    // Check logo field
    if (item.logo && typeof item.logo === 'string' && isNotionTemporaryUrl(item.logo)) {
      console.warn(`⚠️  WARNING: Notion temporary URL detected in ${dataType}[${itemId}].logo`);
      console.warn(`   This URL will expire and should be replaced with a permanent hosted image.`);
      foundNotionUrls++;
    }

    // Check poapImageLink field (for quests)
    if (item.poapImageLink && typeof item.poapImageLink === 'string' && isNotionTemporaryUrl(item.poapImageLink)) {
      console.warn(`⚠️  WARNING: Notion temporary URL detected in ${dataType}[${itemId}].poapImageLink`);
      console.warn(`   This URL will expire and should be replaced with a permanent hosted image.`);
      foundNotionUrls++;
    }
  });

  if (foundNotionUrls > 0) {
    console.warn(`⚠️  TOTAL: Found ${foundNotionUrls} Notion temporary URL(s) in ${dataType}`);
    console.warn(`   These URLs contain X-Amz-Security-Token and will expire.`);
    console.warn('');
  }
}

async function fetchData(): Promise<ApiResponse | ApiErrorResponse> {
  console.log(`Fetching data from: ${API_ENDPOINT}`);
  
  try {
    const response = await fetch(API_ENDPOINT);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: ApiResponse | ApiErrorResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

async function saveData(data: ApiResponse): Promise<void> {
  if (!data.success || !data.data) {
    throw new Error('API response indicates failure or missing data');
  }

  const { supporters, pois, districts, locations, poiGroups } = data.data;

  // Check for Notion temporary URLs before saving
  console.log('\n🔍 Checking for Notion temporary URLs...\n');
  checkForNotionUrls(supporters, 'supporters');
  checkForNotionUrls(pois, 'pois');
  checkForNotionUrls(districts, 'districts');
  checkForNotionUrls(locations, 'locations');

  // Ensure data directory exists
  await fs.mkdir(DATA_DIR, { recursive: true });

  // Generate TypeScript content
  const supportersContent = `import type { Supporter } from '@/types/api-data';

export const supportersData: Record<string, Supporter> = ${JSON.stringify(supporters, null, 2)};
`;

  const poisContent = `import type { POI } from '@/types/api-data';

export const poisData: POI[] = ${JSON.stringify(pois, null, 2)};
`;

  // Add layerName to districts
  const districtsWithLayerName = Object.fromEntries(
    Object.entries(districts).map(([id, district]) => [
      id,
      {
        ...district,
        layerName: district.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-')
      }
    ])
  );

  const districtsContent = `import type { Districts } from '@/types/api-data';

export const districtsData: Districts = ${JSON.stringify(districtsWithLayerName, null, 2)};
`;

  // Add layerName to locations
  const locationsWithLayerName = Object.fromEntries(
    Object.entries(locations).map(([id, location]) => [
      id,
      {
        ...location,
        layerName: location.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-')
      }
    ])
  );

  const locationsContent = `import type { Locations } from '@/types/api-data';

export const locationsData: Locations = ${JSON.stringify(locationsWithLayerName, null, 2)};
`;

  const poiGroupsContent = `import type { PoiGroups } from '@/types/api-data';

export const poiGroupsData: PoiGroups = ${JSON.stringify(poiGroups, null, 2)};
`;

  // Save individual data files
  await Promise.all([
    fs.writeFile(SUPPORTERS_FILE, supportersContent),
    fs.writeFile(POIS_FILE, poisContent),
    // fs.writeFile(DISTRICTS_FILE, districtsContent),
    fs.writeFile(LOCATIONS_FILE, locationsContent),
    fs.writeFile(POI_GROUPS_FILE, poiGroupsContent),
    // fs.writeFile(FULL_DATA_FILE, JSON.stringify(data, null, 2))
  ]);

  console.log('✅ Data saved successfully:');
  console.log(`  - Supporters: ${Object.keys(supporters).length} items`);
  console.log(`  - POIs: ${pois.length} items`);
  console.log(`  - Districts: ${Object.keys(districts).length} items`);
  console.log(`  - Locations: ${Object.keys(locations).length} items`);
  console.log(`  - POI Groups: ${Object.keys(poiGroups).length} items`);
  console.log(`  - Full API response saved to api-data.json`);
}

async function main(): Promise<void> {
  try {
    console.log('🚀 Starting data fetch...');

    const data = await fetchData();

    if (!data.success) {
      const errorData = data as ApiErrorResponse;
      console.error('❌ API returned error:', errorData.error);
      console.error('Details:', errorData.details);
      process.exit(1);
    }

    // Check if we have the required environment for image processing
    const canProcessImages = verifyEnvironmentForImageProcessing();

    // Process all Notion temporary images if environment is set up
    if (canProcessImages) {
      const processedCount = await processAllNotionImages(data as ApiResponse);

      // If we processed any images, fetch data again to get the updated URLs
      if (processedCount > 0) {
        console.log('\n🔄 Re-fetching data to get updated URLs...');
        const updatedData = await fetchData();
        if (updatedData.success) {
          await saveData(updatedData as ApiResponse);
        }
      } else {
        await saveData(data as ApiResponse);
      }
    } else {
      console.log('\n⚠️  Skipping image processing (NOTION_SECRET not configured)');
      await saveData(data as ApiResponse);
    }

    console.log('🎉 Data fetch completed successfully!');

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
