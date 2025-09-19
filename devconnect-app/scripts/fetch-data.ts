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

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the base URL for the API
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_ENDPOINT = `${API_BASE_URL}/api/data`;

// Define output paths
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const SUPPORTERS_FILE = path.join(DATA_DIR, 'supporters.ts');
const POIS_FILE = path.join(DATA_DIR, 'pois.ts');
const DISTRICTS_FILE = path.join(DATA_DIR, 'districts.ts');
const LOCATIONS_FILE = path.join(DATA_DIR, 'locations.ts');
const POI_GROUPS_FILE = path.join(DATA_DIR, 'poiGroups.ts');
const FULL_DATA_FILE = path.join(DATA_DIR, 'api-data.json');

// Using the imported ApiResponse type from ../src/types

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
    
    await saveData(data as ApiResponse);
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
