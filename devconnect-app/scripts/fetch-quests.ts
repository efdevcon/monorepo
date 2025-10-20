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
import { questGroupsData } from '../src/data/questGroups';

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

// Interface for API response that includes fields we don't want in the final Quest type
interface ApiQuestResponse {
  id: number;
  name: string;
  order: number;
  instructions: string;
  action: string;
  button: string;
  conditionType: string;
  conditionValues: string;
  supporterId: string;
  poapImageLink: string;
  group: string;
}

interface ApiResponse {
  success: boolean;
  quests?: ApiQuestResponse[];
  total?: number;
  error?: string;
  details?: string;
  timestamp: string;
}

/**
 * Check if a URL is a Notion-hosted temporary image URL
 */
function isNotionTemporaryUrl(url: string): boolean {
  return url.includes('X-Amz-Security-Token');
}

/**
 * Check for Notion temporary URLs in an object and log warnings
 */
function checkForNotionUrls(data: any[], dataType: string): void {
  let foundNotionUrls = 0;

  data.forEach((item: any, index: number) => {
    const itemId = item.id || item.name || index;

    // Check logo field
    if (item.logo && typeof item.logo === 'string' && isNotionTemporaryUrl(item.logo)) {
      console.warn(`⚠️  WARNING: Notion temporary URL detected in ${dataType}[${itemId}].logo`);
      console.warn(`   This URL will expire and should be replaced with a permanent hosted image.`);
      foundNotionUrls++;
    }

    // Check poapImageLink field
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

  // Check for Notion temporary URLs before saving
  console.log('\n🔍 Checking for Notion temporary URLs...\n');
  checkForNotionUrls(quests, 'quests');

  // Ensure data directory exists
  await fs.mkdir(DATA_DIR, { recursive: true });

  // Create a mapping from group names to group IDs
  const groupNameToIdMap = new Map<string, number>();
  questGroupsData.forEach(group => {
    groupNameToIdMap.set(group.name, group.id);
  });

  // Process quests to add districtId and groupId
  const processedQuests: Quest[] = quests.map((quest) => {
    let districtId: string | undefined;
    let groupId: number | undefined;

    // Map group name to group ID (remove numbered prefix if present)
    if (quest.group) {
      // Remove numbered prefix like "1. ", "2. ", etc.
      const cleanGroupName = quest.group.replace(/^\d+\.\s*/, '');
      groupId = groupNameToIdMap.get(cleanGroupName);
      if (!groupId) {
        console.warn(`Warning: No group ID found for group name: "${quest.group}" (cleaned: "${cleanGroupName}")`);
        groupId = 1; // Default to first group if not found
      }
    } else {
      groupId = 1; // Default to first group if no group specified
    }

    // Add district information based on supporterId
    if (quest.supporterId) {
      const supporter = supportersData[quest.supporterId];
      if (supporter && supporter.districtId) {
        districtId = supporter.districtId;
      }
    }

    // Remove group and add processed fields
    const { group, ...questWithoutGroup } = quest;
    return {
      ...questWithoutGroup,
      action: quest.action as Quest['action'],
      conditionType: quest.conditionType as Quest['conditionType'],
      groupId,
      districtId,
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

  // Count quests with different types of information
  const questsWithDistricts = processedQuests.filter(quest => quest.districtId).length;
  const questsWithGroups = processedQuests.filter(quest => quest.groupId).length;

  console.log('✅ Quest data saved successfully:');
  console.log(`  - Quests: ${processedQuests.length} items`);
  console.log(`  - Quests with group IDs: ${questsWithGroups} items`);
  console.log(`  - Quests with district info: ${questsWithDistricts} items`);
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
