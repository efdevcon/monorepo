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
};

// AppKit specific constants
export const APP_NAME = "Devconnect App";
export const APP_DESCRIPTION = "Your companion for Devconnect ARG, the first Ethereum World's Fair.";

// Authorized sponsor addresses for transaction execution
export const AUTHORIZED_SPONSOR_ADDRESSES = [
  '0x20c85697e4789d7a1570e78688567160426d4cdd',
  '0x8c7ABe004Ab7E07C81862A44a10faeA1C4a7feE3',
  '0xa13b2adfdb29a6a99250ef94eba78b3f86c35925',
  '0xb9256b2e7996a39d5001b06d779be91ab059ae2c',
  '0x6aee565426992091321c7a5a7056930f14120455',
  '0xa45697261e5cc838725830f2222357b6c0f7313f',
  '0x39715b48483fa9207f6bfe7809e8b45dfeb1c455',
  '0x1fdd2abae8b49dc6204db9f5e9fcb02dedc3557d',
  '0x631009d099fb6f0b3f938a50a593deeaa01d5ca5',
  '0x91830f4a7ae53dfcb41569e1bf0514ba7713ad43',
  '0x5685c438d75d454b44cecfda44b7a942fb2a8814',
  '0x9f7Ba98d2656c95314dD890c5d332cC60a57AE34',
  '0x9eeccbec6120abc6ae16b6dec4e70eee8c7acbbe',
  '0x2bd84c995ac420aae171e0a4677b73fbfcf43563',
  '0x6f788bd865c770468651e5587742aa1fefc20b9d',
  '0xf1edab2ca97bcfb7480ac7d7106e4c6cb23c955c'
];

// Payment configuration
export const PAYMENT_CONFIG = {
  MERCHANT_ID: '6603276727aaa6386588474d',
  SIMPLEFI_BASE_URL: 'https://www.pagar.simplefi.tech'
};

// Coinbase CDP Smart Accounts (Base Mainnet)
export const CDP_SMART_ACCOUNTS = {
  PAYMENT: '0xd127a1bFEdd21E04784c60070b7c8A2F2Ff176c7', // For payment transactions
  SEND: '0x407AC50a73F1649D4939c2b12697b418873f6896',    // For send transactions
};

// ERC-4337 EntryPoint (used for identifying sponsored transactions)
export const ENTRYPOINT_ADDRESS = '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789'; 

export const REPORT_ISSUE_URL = 'http://devconnect.org/form/issue/new';
