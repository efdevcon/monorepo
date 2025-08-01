import { Environment } from "@getpara/react-sdk";

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
      ? Environment.PROD
      : Environment.BETA,

  BASE_RPC_URL: `https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_APIKEY}` || "https://mainnet.base.org",
};

// AppKit specific constants
export const APP_NAME = "Devconnect App";
export const APP_DESCRIPTION = "Your companion for Devconnect ARG, the first Ethereum World's Fair."; 
