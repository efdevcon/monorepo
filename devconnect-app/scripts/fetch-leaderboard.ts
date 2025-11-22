#!/usr/bin/env tsx

/**
 * Script to fetch leaderboard data from POAP Compass API and save it to the data folder
 * 
 * Usage:
 *   pnpm run lb                                    # Fetch top 100 (default)
 *   pnpm run lb -- --limit 50                      # Fetch top 50
 *   pnpm run lb -- -l 200                          # Fetch top 200
 *   
 *   or
 *   
 *   npx tsx scripts/fetch-leaderboard.ts           # Fetch top 100 (default)
 *   npx tsx scripts/fetch-leaderboard.ts --limit 50   # Fetch top 50
 *   npx tsx scripts/fetch-leaderboard.ts -l 200       # Fetch top 200
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define output paths
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.ts');

// API configuration
const GRAPHQL_ENDPOINT = 'https://public.compass.poap.tech/v1/graphql';
const PROFILES_ENDPOINT = 'https://profiles.poap.tech/bulk/profile/';
const DROP_IDS = '{191854,209863,210081,210208,210366,210571,211184,211191,211316,211354,211437,211440,211441,211461,211477,211478,211482,211485,211504,211511,211512,211519,211520,211527,211528,211533,211534,211536,211541,211543,211546,211549,211551,211552,211622,212186,212242,212301,212563,212590,212591,212603,212604,212608,212684,212687,212700,213239,213273,213333,213370,213407,213463,213471,213890,213891,213892,213893,213894,213895,213896,213897,213898,213899,213955,214006,214156,214344,214345,214359,214365,214439,214460}';

const GRAPHQL_QUERY = `
  query CollectionsLeaderboard($limit: Int, $offset: Int, $dropIds: _int4) {
    collections_leaderboard(args: { drop_ids: $dropIds }, limit: $limit, offset: $offset) {
      address
      poaps_owned
    }
  }
`;

interface LeaderboardEntry {
  position: number;
  address: string;
  ensName: string;
  avatar: string;
  score: number;
}

interface GraphQLResponse {
  data: {
    collections_leaderboard: Array<{
      address: string;
      poaps_owned: number;
    }>;
  };
}

interface ProfileResponse {
  profiles: Array<{
    ens?: string;
    address: string;
    records?: {
      avatar?: string;
      description?: string;
      url?: string;
      header?: string;
    };
    fresh?: number;
  }>;
}

/**
 * Check if a string is an ENS name (contains a dot)
 */
function isEnsName(address: string): boolean {
  return address.includes('.');
}

/**
 * Fetch leaderboard data from POAP Compass API (single batch)
 */
async function fetchLeaderboardBatch(limit: number, offset: number): Promise<Array<{ address: string; score: number }>> {
  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'content-type': 'application/json',
        'x-api-key': 'frontend',
        'origin': 'https://collections.poap.xyz',
        'referer': 'https://collections.poap.xyz/',
      },
      body: JSON.stringify({
        query: GRAPHQL_QUERY,
        variables: {
          limit,
          offset,
          dropIds: DROP_IDS
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: GraphQLResponse = await response.json();
    
    // Extract addresses and scores
    const entries = data.data.collections_leaderboard.map(entry => ({
      address: entry.address.toLowerCase(),
      score: entry.poaps_owned
    }));
    
    return entries;
    
  } catch (error) {
    console.error('Error fetching leaderboard batch:', error);
    throw error;
  }
}

/**
 * Fetch leaderboard data from POAP Compass API with pagination
 */
async function fetchLeaderboard(totalLimit: number = 100): Promise<Array<{ address: string; score: number }>> {
  console.log(`Fetching leaderboard data (requesting ${totalLimit} entries)...`);
  
  const BATCH_SIZE = 100; // API limit per request
  const allEntries: Array<{ address: string; score: number }> = [];
  let offset = 0;
  
  while (allEntries.length < totalLimit) {
    const remainingNeeded = totalLimit - allEntries.length;
    const batchLimit = Math.min(BATCH_SIZE, remainingNeeded);
    
    console.log(`  Fetching batch at offset ${offset} (limit: ${batchLimit})...`);
    
    const batch = await fetchLeaderboardBatch(batchLimit, offset);
    
    if (batch.length === 0) {
      console.log(`  No more entries available (total fetched: ${allEntries.length})`);
      break;
    }
    
    allEntries.push(...batch);
    offset += batch.length;
    
    // If we got less than requested, we've reached the end
    if (batch.length < batchLimit) {
      console.log(`  Reached end of leaderboard (total fetched: ${allEntries.length})`);
      break;
    }
    
    // Small delay between batches to avoid rate limiting
    if (allEntries.length < totalLimit) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log(`✅ Fetched ${allEntries.length} leaderboard entries total`);
  return allEntries;
}

/**
 * Fetch ENS profiles in batches
 * The API supports bulk lookups with comma-separated addresses
 */
async function fetchProfiles(addresses: string[]): Promise<Map<string, { ensName: string; avatar: string }>> {
  const BATCH_SIZE = 50; // Batch size for bulk profile lookups
  const profileMap = new Map<string, { ensName: string; avatar: string }>();
  
  console.log(`Fetching ENS profiles for ${addresses.length} addresses...`);
  
  // Process in batches
  for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
    const batch = addresses.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(addresses.length / BATCH_SIZE);
    
    console.log(`  Fetching batch ${batchNum}/${totalBatches} (${batch.length} addresses)...`);
    
    try {
      const url = `${PROFILES_ENDPOINT}${batch.join(',')}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`  ⚠️  Failed to fetch batch ${batchNum}: ${response.status}`);
        continue;
      }
      
      const data: ProfileResponse = await response.json();
      
      // Map profiles to addresses
      data.profiles.forEach(profile => {
        const address = profile.address.toLowerCase();
        const ensName = profile.ens || '';
        // Use ensdata.net for avatars if ENS name exists
        const avatar = ensName && profile.records?.avatar ? `https://profiles.poap.tech/avatar/${ensName}` : '';
        profileMap.set(address, {
          ensName,
          avatar
        });
      });
      
      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.warn(`  ⚠️  Error fetching batch ${batchNum}:`, error);
    }
  }
  
  console.log(`✅ Fetched ${profileMap.size} ENS profiles`);
  return profileMap;
}

/**
 * Merge leaderboard data with ENS profiles
 */
function mergeLeaderboardWithProfiles(
  leaderboardEntries: Array<{ address: string; score: number }>,
  profileMap: Map<string, { ensName: string; avatar: string }>
): LeaderboardEntry[] {
  return leaderboardEntries.map((entry, index) => {
    const profile = profileMap.get(entry.address);
    return {
      position: index + 1,
      address: entry.address,
      ensName: profile?.ensName || '',
      avatar: profile?.avatar || '',
      score: entry.score
    };
  });
}

/**
 * Generate TypeScript file content
 */
function generateFileContent(entries: LeaderboardEntry[]): string {
  return `export interface LeaderboardEntry {
  position: number;
  address: string;
  ensName: string;
  avatar: string;
  score: number;
}

export const leaderboardData: LeaderboardEntry[] = ${JSON.stringify(entries, null, 2)};
`;
}

/**
 * Save leaderboard data to file
 */
async function saveLeaderboard(entries: LeaderboardEntry[]): Promise<void> {
  // Ensure data directory exists
  await fs.mkdir(DATA_DIR, { recursive: true });
  
  // Generate and write the TypeScript file
  const content = generateFileContent(entries);
  await fs.writeFile(LEADERBOARD_FILE, content);
  
  const withEns = entries.filter(e => e.ensName).length;
  const withAvatar = entries.filter(e => e.avatar).length;
  
  console.log('✅ Leaderboard data saved successfully:');
  console.log(`  - Total entries: ${entries.length}`);
  console.log(`  - Entries with ENS names: ${withEns}`);
  console.log(`  - Entries with avatars: ${withAvatar}`);
  console.log(`  - File: ${LEADERBOARD_FILE}`);
}

async function main(): Promise<void> {
  try {
    // Parse command line arguments for limit
    const args = process.argv.slice(2);
    let limit = 100; // Default limit
    
    // Check for --limit or -l flag
    const limitArgIndex = args.findIndex(arg => arg === '--limit' || arg === '-l');
    if (limitArgIndex !== -1 && args[limitArgIndex + 1]) {
      const parsedLimit = parseInt(args[limitArgIndex + 1], 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = parsedLimit;
      } else {
        console.warn('⚠️  Invalid limit value, using default: 100');
      }
    }
    
    console.log('🚀 Starting leaderboard data fetch...');
    console.log(`📊 Fetching top ${limit} entries`);
    
    // Fetch leaderboard data
    const leaderboardEntries = await fetchLeaderboard(limit);
    
    if (leaderboardEntries.length === 0) {
      console.warn('⚠️  No leaderboard entries found');
      process.exit(1);
    }
    
    // Extract unique addresses for profile lookup
    const addresses = [...new Set(leaderboardEntries.map(e => e.address))];
    
    // Fetch ENS profiles
    const profileMap = await fetchProfiles(addresses);
    
    // Merge data
    const entries = mergeLeaderboardWithProfiles(leaderboardEntries, profileMap);
    
    // Save to file
    await saveLeaderboard(entries);
    console.log('🎉 Leaderboard data fetch completed successfully!');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
