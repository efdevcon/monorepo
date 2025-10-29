#!/usr/bin/env tsx

/**
 * Script to import claiming links from CSV into the database
 * 
 * Usage:
 *   pnpm l <amount> <csv-file>
 *   
 * Example:
 *   pnpm l 5 links_1.csv
 *   pnpm l 5 scripts/csv/links_1.csv  (full path also works)
 * 
 * Arguments:
 *   amount - The amount (in USDC or other currency) for each claiming link
 *   csv-file - Filename (looks in scripts/csv/) or full path to CSV file
 */

import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') });

// Validate environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_KEY are set in .env.local');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Parse CSV file and return array of links
 */
async function parseCsvFile(filePath: string): Promise<string[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    return lines;
  } catch (error) {
    console.error(`❌ Error reading CSV file: ${filePath}`);
    throw error;
  }
}

/**
 * Insert claiming links into database
 */
async function importClaimingLinks(links: string[], amount: number): Promise<void> {
  console.log(`\n📦 Importing ${links.length} claiming links with amount: ${amount}...`);
  
  // Prepare data for bulk insert
  const records = links.map(link => ({
    link,
    amount,
    claimed_by_user_email: null,
    claimed_by_address: null,
    claimed_date: null,
    ticket_secret_proof: null,
  }));

  // Insert in batches to avoid potential size limits
  const BATCH_SIZE = 100;
  let successCount = 0;
  let errorCount = 0;
  const duplicates: string[] = [];
  const otherErrors: Array<{ link: string; error: string }> = [];

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    
    const { data, error } = await supabase
      .from('devconnect_app_claiming_links')
      .insert(batch)
      .select();

    if (error) {
      // If batch insert fails, try inserting one by one to identify which specific records failed
      console.log(`⚠️  Batch insert failed, checking individual records...`);
      
      for (const record of batch) {
        const { data: singleData, error: singleError } = await supabase
          .from('devconnect_app_claiming_links')
          .insert(record)
          .select();

        if (singleError) {
          errorCount++;
          if (singleError.message.includes('duplicate key') || singleError.code === '23505') {
            duplicates.push(record.link);
          } else {
            otherErrors.push({ link: record.link, error: singleError.message });
          }
        } else {
          successCount++;
        }
      }
    } else {
      successCount += data?.length || batch.length;
      console.log(`✅ Inserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} records)`);
    }
  }

  console.log(`\n✨ Import complete!`);
  console.log(`   Success: ${successCount} records`);
  if (errorCount > 0) {
    console.log(`   Errors: ${errorCount} records`);
  }
  
  if (duplicates.length > 0) {
    console.log(`\n🔁 Duplicate links (already in database):`);
    duplicates.forEach((link, idx) => {
      console.log(`   ${idx + 1}. ${link}`);
    });
  }
  
  if (otherErrors.length > 0) {
    console.log(`\n❌ Other errors:`);
    otherErrors.forEach(({ link, error }, idx) => {
      console.log(`   ${idx + 1}. ${link}`);
      console.log(`      Error: ${error}`);
    });
  }
}

/**
 * Main function
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.error('❌ Error: Invalid arguments');
    console.error('');
    console.error('Usage:');
    console.error('  pnpm l <amount> <csv-file>');
    console.error('');
    console.error('Example:');
    console.error('  pnpm l 5 links_1.csv');
    console.error('  pnpm l 5 scripts/csv/links_1.csv  (full path also works)');
    console.error('');
    console.error('Arguments:');
    console.error('  amount   - The amount (in USDC or other currency) for each claiming link');
    console.error('  csv-file - Filename (looks in scripts/csv/) or full path to CSV file');
    process.exit(1);
  }

  const [amountStr, csvFilePath] = args;
  const amount = parseFloat(amountStr);

  // Validate amount
  if (isNaN(amount) || amount <= 0) {
    console.error('❌ Error: Amount must be a positive number');
    process.exit(1);
  }

  // Resolve file path - check scripts/csv/ directory first if just a filename is provided
  let resolvedPath: string;
  if (path.isAbsolute(csvFilePath)) {
    resolvedPath = csvFilePath;
  } else if (csvFilePath.includes('/')) {
    // Has a path separator, use as provided
    resolvedPath = path.join(process.cwd(), csvFilePath);
  } else {
    // Just a filename, look in scripts/csv/ directory
    resolvedPath = path.join(process.cwd(), 'scripts', 'csv', csvFilePath);
  }

  console.log('📋 Import Claiming Links');
  console.log('========================');
  console.log(`Amount: ${amount}`);
  console.log(`CSV File: ${resolvedPath}`);

  try {
    // Parse CSV file
    const links = await parseCsvFile(resolvedPath);
    console.log(`\n📄 Found ${links.length} links in CSV file`);

    // Confirm import
    console.log('\nℹ️  This will insert the links into the database.');
    
    // Import links
    await importClaimingLinks(links, amount);
    
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  }
}

// Run the script
main();

