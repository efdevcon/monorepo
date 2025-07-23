import { ParaWeb } from "@getpara/react-sdk";
import { APP_CONFIG } from "./config";

if (!APP_CONFIG.PARA_API_KEY) {
  throw new Error(
    "API key is not defined. Please set NEXT_PUBLIC_PARA_API_KEY in your environment variables."
  );
}

export const para = new ParaWeb(APP_CONFIG.PARA_ENVIRONMENT, APP_CONFIG.PARA_API_KEY); 
