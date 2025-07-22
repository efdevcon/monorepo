import { API_KEY, ENVIRONMENT } from "@/config/constants";
import { ParaWeb } from "@getpara/react-sdk";

export const para = new ParaWeb(ENVIRONMENT, API_KEY); 
