#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env.local') });

import { getSmartWalletAddress } from '../src/lib/coinbase-smart-wallet';

async function main() {
  console.log('🚀 CDP v2 Smart Account Setup\n');
  
  try {
    const address = await getSmartWalletAddress();
    
    console.log('📝 Next Steps:');
    console.log(`   1. Fund smart account: Send 0.00001+ ETH to ${address}`);
    console.log('   2. Test a USDC transfer');
    console.log('   3. Monitor at https://portal.cdp.coinbase.com/\n');
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error('\nMake sure you have in .env.local:');
    console.error('   - CDP_API_KEY_ID');
    console.error('   - CDP_API_KEY_SECRET');
    console.error('   - CDP_WALLET_SECRET');
    process.exit(1);
  }
}

main();
