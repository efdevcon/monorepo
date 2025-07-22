import { Environment } from "@getpara/react-sdk";

export const API_KEY = process.env.NEXT_PUBLIC_PARA_API_KEY ?? "";
export const ENVIRONMENT =
  (process.env.NEXT_PUBLIC_PARA_ENVIRONMENT as Environment) || Environment.BETA;

if (!API_KEY) {
  throw new Error(
    "API key is not defined. Please set NEXT_PUBLIC_PARA_API_KEY in your environment variables."
  );
}

export const SEPOLIA_RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

export const WALLET_CONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID || ""; 
