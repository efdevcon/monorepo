#!/usr/bin/env tsx

/**
 * Script to filter unclaimed links from a CSV file using Peanut SDK
 * 
 * Usage:
 *   pnpm u <csv-file>
 *   
 * Example:
 *   pnpm u links_1.csv
 *   pnpm u scripts/csv/links_1.csv  (full path also works)
 * 
 * Arguments:
 *   csv-file - Filename (looks in scripts/csv/) or full path to CSV file
 * 
 * Output:
 *   Creates a new file: <input_name>_unclaimed.csv with only unclaimed links
 */

import fs from 'fs/promises';
import path from 'path';
import peanut from '@squirrel-labs/peanut-sdk';

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
 * Check if a link is claimed or unclaimed
 */
async function checkLinkStatus(link: string): Promise<{ link: string; claimed: boolean; error?: string }> {
  try {
    const details = await peanut.getLinkDetails({
      link,
    });
    
    return {
      link,
      claimed: details.claimed,
    };
  } catch (error) {
    return {
      link,
      claimed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Filter unclaimed links from the list
 */
async function filterUnclaimedLinks(links: string[]): Promise<{
  unclaimed: string[];
  claimed: string[];
  errors: Array<{ link: string; error: string }>;
}> {
  console.log(`\n🔍 Checking claim status for ${links.length} links...`);
  console.log('   This may take a while...\n');
  
  const unclaimed: string[] = [];
  const claimed: string[] = [];
  const errors: Array<{ link: string; error: string }> = [];
  
  let processed = 0;
  
  // Process links sequentially to avoid rate limiting
  for (const link of links) {
    const result = await checkLinkStatus(link);
    processed++;
    
    if (result.error) {
      errors.push({ link: result.link, error: result.error });
      console.log(`⚠️  [${processed}/${links.length}] Error checking link: ${result.error.substring(0, 50)}...`);
    } else if (result.claimed) {
      claimed.push(result.link);
      console.log(`❌ [${processed}/${links.length}] Claimed: ${result.link.substring(0, 60)}...`);
    } else {
      unclaimed.push(result.link);
      console.log(`✅ [${processed}/${links.length}] Unclaimed: ${result.link.substring(0, 60)}...`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return { unclaimed, claimed, errors };
}

/**
 * Write unclaimed links to output file
 */
async function writeUnclaimedLinks(links: string[], outputPath: string): Promise<void> {
  try {
    const content = links.join('\n') + '\n';
    await fs.writeFile(outputPath, content, 'utf-8');
    console.log(`\n✅ Wrote ${links.length} unclaimed links to: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Error writing output file: ${outputPath}`);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.length !== 1) {
    console.error('❌ Error: Invalid arguments');
    console.error('');
    console.error('Usage:');
    console.error('  pnpm u <csv-file>');
    console.error('');
    console.error('Example:');
    console.error('  pnpm u links_1.csv');
    console.error('  pnpm u scripts/csv/links_1.csv  (full path also works)');
    console.error('');
    console.error('Arguments:');
    console.error('  csv-file - Filename (looks in scripts/csv/) or full path to CSV file');
    console.error('');
    console.error('Output:');
    console.error('  Creates <input_name>_unclaimed.csv with only unclaimed links');
    process.exit(1);
  }

  const [csvFilePath] = args;

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

  // Generate output path
  const parsedPath = path.parse(resolvedPath);
  const outputPath = path.join(parsedPath.dir, `${parsedPath.name}_unclaimed${parsedPath.ext}`);

  console.log('🔍 Filter Unclaimed Links');
  console.log('=========================');
  console.log(`Input File:  ${resolvedPath}`);
  console.log(`Output File: ${outputPath}`);

  try {
    // Parse CSV file
    const links = await parseCsvFile(resolvedPath);
    console.log(`\n📄 Found ${links.length} links in CSV file`);

    // Filter unclaimed links
    const { unclaimed, claimed, errors } = await filterUnclaimedLinks(links);
    
    // Print summary
    console.log('\n📊 Summary:');
    console.log('===========');
    console.log(`✅ Unclaimed: ${unclaimed.length} links`);
    console.log(`❌ Claimed:   ${claimed.length} links`);
    if (errors.length > 0) {
      console.log(`⚠️  Errors:    ${errors.length} links`);
    }
    
    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach(({ link, error }, idx) => {
        console.log(`   ${idx + 1}. ${link}`);
        console.log(`      Error: ${error}`);
      });
    }
    
    // Write unclaimed links to output file
    if (unclaimed.length > 0) {
      await writeUnclaimedLinks(unclaimed, outputPath);
    } else {
      console.log('\n⚠️  No unclaimed links found. Output file not created.');
    }
    
  } catch (error) {
    console.error('\n❌ Filtering failed:', error);
    process.exit(1);
  }
}

// Run the script
main();

