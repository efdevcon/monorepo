#!/usr/bin/env tsx

/**
 * Script to get detailed information about a Peanut protocol link
 * 
 * Usage:
 *   pnpm p '<peanut-link>'
 *   
 * Example:
 *   pnpm p 'https://peanut.me/claim?c=42161&v=v4.3&i=6524#p=hzfg12SjsO0CZ3yz'
 * 
 * Arguments:
 *   peanut-link - The Peanut protocol claiming link URL (must be quoted)
 * 
 * Important:
 *   Always wrap the URL in single quotes! The & and # characters have special
 *   meaning in the shell and will cause the command to fail without quotes.
 * 
 * Output:
 *   Fetches and displays link details from two sources:
 *   1. Peanut SDK (peanut.getLinkDetails)
 *   2. Peanut API (api.peanut.me/send-links)
 * 
 *   Information includes:
 *   - Claim status and events
 *   - Token information (symbol, amount, decimals, address)
 *   - Chain details
 *   - Sender and recipient addresses
 *   - Transaction hashes and timestamps
 */

import peanut from '@squirrel-labs/peanut-sdk';

/**
 * Parse Peanut link to extract parameters
 */
function parsePeanutLink(link: string, sdkDetails?: any): {
  pubKey: string;
  chainId: string;
  version: string;
  depositIdx: string;
} | null {
  try {
    const url = new URL(link);
    const chainId = url.searchParams.get('c');
    const version = url.searchParams.get('v');
    const depositIdx = url.searchParams.get('i');
    
    // Get pubKey from SDK details if available (more reliable)
    let pubKey = sdkDetails?.rawOnchainDepositInfo?.pubKey20;
    
    // Fallback: try to get from URL hash (#p=...) or query param
    if (!pubKey) {
      const hashMatch = url.hash.match(/#p=([^&]+)/);
      if (hashMatch) {
        pubKey = hashMatch[1];
      } else {
        pubKey = url.searchParams.get('p');
      }
    }
    
    if (!pubKey || !chainId || !version || !depositIdx) {
      return null;
    }
    
    return { pubKey, chainId, version, depositIdx };
  } catch (error) {
    return null;
  }
}

/**
 * Get detailed information about a Peanut link from the SDK
 */
async function getLinkDetailsFromSDK(link: string): Promise<any> {
  try {
    const details = await peanut.getLinkDetails({
      link,
    });
    
    return details;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Get detailed information about a Peanut link from the API
 */
async function getLinkDetailsFromAPI(link: string, sdkDetails?: any): Promise<any> {
  const params = parsePeanutLink(link, sdkDetails);
  
  if (!params) {
    throw new Error('Invalid Peanut link format');
  }
  
  const { pubKey, chainId, version, depositIdx } = params;
  const apiUrl = `https://api.peanut.me/send-links/${pubKey}?c=${chainId}&v=${version}&i=${depositIdx}`;
  console.log('apiUrl', apiUrl);
  
  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Format and display SDK link details in a readable format
 */
function displaySDKDetails(details: any): void {
  console.log('\n📋 SDK Link Details:');
  console.log('====================\n');
  
  // Basic status
  console.log('Status:');
  console.log(`  Claimed: ${details.claimed ? '❌ Yes' : '✅ No'}`);
  
  // Token information
  if (details.tokenSymbol || details.tokenAmount) {
    console.log('\nToken Information:');
    if (details.tokenSymbol) console.log(`  Symbol: ${details.tokenSymbol}`);
    if (details.tokenAmount) console.log(`  Amount: ${details.tokenAmount}`);
    if (details.tokenDecimals) console.log(`  Decimals: ${details.tokenDecimals}`);
    if (details.tokenAddress) console.log(`  Address: ${details.tokenAddress}`);
  }
  
  // Chain information
  if (details.chainId) {
    console.log('\nChain Information:');
    console.log(`  Chain ID: ${details.chainId}`);
  }
  
  // Sender information
  if (details.senderAddress) {
    console.log('\nSender:');
    console.log(`  Address: ${details.senderAddress}`);
  }
  
  // Recipient/Claimer information
  if (details.claimed) {
    console.log('\nClaimer:');
    if (details.claimedBy) console.log(`  Address: ${details.claimedBy}`);
    if (details.claimedAt) console.log(`  Claimed At: ${new Date(details.claimedAt).toLocaleString()}`);
  }
  
  // Transaction information
  if (details.txHash) {
    console.log('\nTransaction:');
    console.log(`  Hash: ${details.txHash}`);
  }
  
  // Deposit information
  if (details.depositDate) {
    console.log('\nDeposit:');
    console.log(`  Date: ${new Date(details.depositDate).toLocaleString()}`);
    if (details.depositIndex !== undefined) console.log(`  Index: ${details.depositIndex}`);
  }
  
  // Full raw details
  console.log('\n🔍 Raw SDK Response (JSON):');
  console.log('===========================\n');
  console.log(JSON.stringify(details, null, 2));
}

/**
 * Format and display API link details in a readable format
 */
function displayAPIDetails(data: any): void {
  console.log('\n📋 API Link Details:');
  console.log('====================\n');
  
  // Basic status
  console.log('Status:');
  console.log(`  Status: ${data.status}`);
  console.log(`  Created At: ${data.createdAt ? new Date(data.createdAt).toLocaleString() : 'N/A'}`);
  
  // Public key and deposit info
  console.log('\nLink Information:');
  console.log(`  Public Key: ${data.pubKey}`);
  console.log(`  Deposit Index: ${data.depositIdx}`);
  console.log(`  Chain ID: ${data.chainId}`);
  console.log(`  Contract Version: ${data.contractVersion}`);
  
  // Token and amount information
  if (data.amount || data.tokenAddress) {
    console.log('\nToken Information:');
    if (data.amount?.value) console.log(`  Amount: ${data.amount.value}`);
    if (data.tokenAddress) console.log(`  Token Address: ${data.tokenAddress}`);
  }
  
  // Sender information
  if (data.senderAddress) {
    console.log('\nSender:');
    console.log(`  Address: ${data.senderAddress}`);
  }
  
  // Claim information
  if (data.claim) {
    console.log('\nClaim Information:');
    console.log(`  Amount: ${data.claim.amount}`);
    console.log(`  Token Address: ${data.claim.tokenAddress}`);
    console.log(`  Recipient Address: ${data.claim.recipientAddress}`);
    console.log(`  Transaction Hash: ${data.claim.txHash}`);
  }
  
  // Events
  if (data.events && data.events.length > 0) {
    console.log('\nEvents:');
    data.events.forEach((event: any, idx: number) => {
      console.log(`  Event ${idx + 1}:`);
      console.log(`    Status: ${event.status}`);
      console.log(`    Timestamp: ${new Date(event.timestamp).toLocaleString()}`);
      if (event.reason) console.log(`    Reason: ${event.reason}`);
    });
  }
  
  // Full raw details
  console.log('\n🔍 Raw API Response (JSON):');
  console.log('===========================\n');
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Main function
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Error: No link provided');
    console.error('');
    console.error('Usage:');
    console.error('  pnpm p \'<peanut-link>\'');
    console.error('');
    console.error('Example:');
    console.error('  pnpm p \'https://peanut.me/claim?c=42161&v=v4.3&i=6524#p=hzfg12SjsO0CZ3yz\'');
    console.error('');
    console.error('Arguments:');
    console.error('  peanut-link - The Peanut protocol claiming link URL (must be quoted)');
    console.error('');
    console.error('⚠️  Important: Always wrap the URL in single quotes!');
    console.error('    The & and # characters have special meaning in the shell.');
    process.exit(1);
  }

  // Get the link from arguments
  let link = args[0];
  
  // Check if the link looks incomplete (missing required parameters)
  // This happens when user doesn't quote the URL and shell truncates it
  const hasRequiredParams = link.includes('?c=') && link.includes('v=') && link.includes('i=');
  
  if (!hasRequiredParams) {
    console.error('❌ Error: The link appears to be incomplete or malformed.');
    console.error('');
    console.error('🔍 Detected link:', link);
    console.error('');
    console.error('💡 Tip: Peanut links contain special characters (&, #) that must be quoted.');
    console.error('');
    console.error('✅ Correct usage:');
    console.error('  pnpm p \'https://peanut.me/claim?c=42161&v=v4.3&i=6524#p=...\'');
    console.error('');
    console.error('❌ Wrong usage (missing quotes):');
    console.error('  pnpm p https://peanut.me/claim?c=42161&v=v4.3&i=6524#p=...');
    console.error('');
    console.error('The shell interprets & as "run in background" and # as "comment".');
    console.error('Always wrap the URL in single quotes to prevent this.');
    process.exit(1);
  }

  console.log('🥜 Peanut Link Details');
  console.log('======================');
  console.log(`Link: ${link}\n`);

  try {
    // Get link details from SDK
    console.log('🔍 Fetching link details from SDK...');
    let sdkDetails;
    try {
      sdkDetails = await getLinkDetailsFromSDK(link);
      displaySDKDetails(sdkDetails);
    } catch (error) {
      console.error('\n⚠️  Failed to get SDK details:', error instanceof Error ? error.message : error);
    }
    
    // Get link details from API (pass SDK details to extract pubKey)
    console.log('\n🔍 Fetching link details from API...');
    try {
      const apiDetails = await getLinkDetailsFromAPI(link, sdkDetails);
      displayAPIDetails(apiDetails);
    } catch (error) {
      console.error('\n⚠️  Failed to get API details:', error instanceof Error ? error.message : error);
    }
    
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('\n❌ Failed to get link details:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the script
main();

