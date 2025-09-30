import { ParaWeb, Environment } from "@getpara/react-sdk";
import { APP_CONFIG } from "./config";

if (!APP_CONFIG.PARA_API_KEY) {
  throw new Error(
    "API key is not defined. Please set NEXT_PUBLIC_PARA_API_KEY in your environment variables."
  );
}

// Convert string environment to Environment enum
const paraEnvironment = APP_CONFIG.PARA_ENVIRONMENT === 'PROD' ? Environment.PROD : Environment.BETA;

export const para = new ParaWeb(paraEnvironment, APP_CONFIG.PARA_API_KEY); 
