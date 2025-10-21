#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env.local') });

import { getSmartWalletAddress } from '../src/lib/coinbase-smart-wallet';

async function main() {
  console.log('🚀 CDP v2 Smart Account Setup\n');
  
  try {
    const paymentAddress = await getSmartWalletAddress('payment');
    const sendAddress = await getSmartWalletAddress('send');
    
    console.log('\n📋 Smart Accounts Created:');
    console.log(`Payment: ${paymentAddress}`);
    console.log(`Send:    ${sendAddress}`);
    console.log('\n📝 Next: Fund both accounts with 0.001+ ETH');
    console.log('Monitor: https://portal.cdp.coinbase.com/\n');
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error('\nRequired in .env.local: CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET');
    process.exit(1);
  }
}

main();
