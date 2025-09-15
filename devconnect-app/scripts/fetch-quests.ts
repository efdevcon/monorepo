#!/usr/bin/env tsx

/**
 * Script to fetch quest data from the /api/quests endpoint and save it to the data folder
 * 
 * Usage:
 *   pnpm run fetch-quests
 *   or
 *   pnpm exec tsx scripts/fetch-quests.ts
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Quest } from '../src/types';
import { supportersData } from '../src/data/supporters';
import { districtsData } from '../src/data/districts';

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the base URL for the API
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_ENDPOINT = `${API_BASE_URL}/api/quests`;

// Define output paths
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const QUESTS_FILE = path.join(DATA_DIR, 'quests.ts');
const FULL_DATA_FILE = path.join(DATA_DIR, 'api-quests.json');

// Using the imported Quest type from ../src/types

interface ApiResponse {
  success: boolean;
  quests?: Quest[];
  total?: number;
  error?: string;
  details?: string;
  timestamp: string;
}

async function fetchQuests(): Promise<ApiResponse> {
  console.log(`Fetching quest data from: ${API_ENDPOINT}`);
  
  try {
    const response = await fetch(API_ENDPOINT);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: ApiResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching quest data:', error);
    throw error;
  }
}

async function saveQuests(data: ApiResponse): Promise<void> {
  if (!data.success || !data.quests) {
    throw new Error('API response indicates failure or missing quest data');
  }

  const { quests } = data;

  // Ensure data directory exists
  await fs.mkdir(DATA_DIR, { recursive: true });

  // Process quests to add districtId and districtSlug based on supporterId
  const processedQuests = quests.map((quest) => {
    let districtId: number | undefined;
    let districtSlug: string | undefined;

    if (quest.supporterId) {
      const supporter = supportersData[quest.supporterId];
      if (supporter && supporter.districtId) {
        districtId = parseInt(supporter.districtId, 10);
        const district = districtsData[supporter.districtId];
        if (district) {
          districtSlug = district.layerName;
        }
      }
    }

    return {
      ...quest,
      districtId,
      districtSlug,
    };
  });

  // Generate TypeScript content
  const questsContent = `import type { Quest } from '@/types';

export const questsData: Quest[] = ${JSON.stringify(processedQuests, null, 2)};
`;

  // Save quest data files
  await Promise.all([
    fs.writeFile(QUESTS_FILE, questsContent),
    // fs.writeFile(FULL_DATA_FILE, JSON.stringify(data, null, 2))
  ]);

  // Count quests with district information
  const questsWithDistricts = processedQuests.filter(quest => quest.districtId && quest.districtSlug).length;

  console.log('✅ Quest data saved successfully:');
  console.log(`  - Quests: ${processedQuests.length} items`);
  console.log(`  - Quests with district info: ${questsWithDistricts} items`);
  console.log(`  - Total points available: ${processedQuests.reduce((sum, quest) => sum + (quest.points || 0), 0)}`);
  console.log(`  - Full API response saved to api-quests.json`);
}

async function main(): Promise<void> {
  try {
    console.log('🚀 Starting quest data fetch...');
    
    const data = await fetchQuests();
    
    if (!data.success) {
      console.error('❌ API returned error:', data.error);
      console.error('Details:', data.details);
      process.exit(1);
    }
    
    await saveQuests(data);
    console.log('🎉 Quest data fetch completed successfully!');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
