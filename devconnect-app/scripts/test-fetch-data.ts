#!/usr/bin/env tsx

/**
 * Test script to verify the data fetching logic without requiring the API to be running
 * This creates sample data to test the saving functionality
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define output paths
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const SUPPORTERS_FILE = path.join(DATA_DIR, 'supporters.json');
const POIS_FILE = path.join(DATA_DIR, 'pois.json');
const DISTRICTS_FILE = path.join(DATA_DIR, 'districts.json');
const LOCATIONS_FILE = path.join(DATA_DIR, 'locations.json');
const FULL_DATA_FILE = path.join(DATA_DIR, 'api-data.json');

// Sample data for testing
const sampleData = {
  success: true,
  data: {
    supporters: [
      {
        name: "Test Supporter 1",
        layerName: "test/supporter-1",
        districtId: "1",
        locationId: "1"
      },
      {
        name: "Test Supporter 2", 
        layerName: "test/supporter-2",
        districtId: "2",
        locationId: "2"
      }
    ],
    pois: [
      {
        name: "Test POI 1",
        layerName: "test/poi-1", 
        districtId: "1",
        locationId: "1"
      }
    ],
    districts: {
      "1": { name: "Test District 1" },
      "2": { name: "Test District 2" }
    },
    locations: {
      "1": { name: "Test Location 1" },
      "2": { name: "Test Location 2" }
    }
  },
  timestamp: new Date().toISOString()
};

async function saveData(data: typeof sampleData): Promise<void> {
  if (!data.success || !data.data) {
    throw new Error('Sample data indicates failure or missing data');
  }

  const { supporters, pois, districts, locations } = data.data;

  // Ensure data directory exists
  await fs.mkdir(DATA_DIR, { recursive: true });

  // Save individual data files
  await Promise.all([
    fs.writeFile(SUPPORTERS_FILE, JSON.stringify(supporters, null, 2)),
    fs.writeFile(POIS_FILE, JSON.stringify(pois, null, 2)),
    fs.writeFile(DISTRICTS_FILE, JSON.stringify(districts, null, 2)),
    fs.writeFile(LOCATIONS_FILE, JSON.stringify(locations, null, 2)),
    fs.writeFile(FULL_DATA_FILE, JSON.stringify(data, null, 2))
  ]);

  console.log('✅ Sample data saved successfully:');
  console.log(`  - Supporters: ${supporters.length} items`);
  console.log(`  - POIs: ${pois.length} items`);
  console.log(`  - Districts: ${Object.keys(districts).length} items`);
  console.log(`  - Locations: ${Object.keys(locations).length} items`);
  console.log(`  - Full API response saved to api-data.json`);
}

async function main(): Promise<void> {
  try {
    console.log('🚀 Starting sample data save test...');
    
    await saveData(sampleData);
    console.log('🎉 Sample data save test completed successfully!');
    console.log('📁 Check the src/data/ directory for the generated files.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

