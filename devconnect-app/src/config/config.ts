export const APP_CONFIG = {
  NODE_ENV: process.env.NODE_ENV || 'development',

  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.devcon.org', // 'http://localhost:4000',

  WC_PROJECT_ID: process.env.NEXT_PUBLIC_WC_PROJECT_ID || '',

  INFURA_APIKEY: process.env.NEXT_PUBLIC_INFURA_APIKEY || '',
  ETHERSCAN_APIKEY: process.env.NEXT_PUBLIC_ETHERSCAN_APIKEY || '',
  ALCHEMY_APIKEY: process.env.NEXT_PUBLIC_ALCHEMY_APIKEY || '',

  PARA_API_KEY: process.env.NEXT_PUBLIC_PARA_API_KEY || '',
  PARA_ENVIRONMENT:
    process.env.NEXT_PUBLIC_PARA_API_KEY?.startsWith('prod_')
      ? 'PROD'
      : 'BETA',

  BASE_RPC_URL: `https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_APIKEY}` || "https://mainnet.base.org",
  SOCIAL_IMAGE: `${process.env.NEXT_PUBLIC_APP_URL}/social.jpg`,
};

// AppKit specific constants
export const APP_NAME = "Devconnect App";
export const APP_DESCRIPTION = "Your companion for Devconnect ARG, the first Ethereum World's Fair.";

// Authorized sponsor addresses for transaction execution
export const AUTHORIZED_SPONSOR_ADDRESSES = [
  '0x20c85697e4789d7a1570e78688567160426d4cdd',
  '0x8c7ABe004Ab7E07C81862A44a10faeA1C4a7feE3',
  '0xa13b2adfdb29a6a99250ef94eba78b3f86c35925',
  '0xb9256b2e7996a39d5001b06d779be91ab059ae2c'
];

// Payment configuration
export const PAYMENT_CONFIG = {
  MERCHANT_ID: '6603276727aaa6386588474d',
  SIMPLEFI_BASE_URL: 'https://www.pagar.simplefi.tech'
}; 
