import type { ChatProvider } from "./types.js";
import { OpenAIChatProvider } from "./openai.js";
import { HuggingFaceChatProvider } from "./huggingface.js";

export type { ChatProvider } from "./types.js";
export type {
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionResponse,
  StreamChunk,
  ToolDefinition,
  ToolCall,
} from "./types.js";

let cachedProvider: ChatProvider | null = null;

export function getChatProvider(): ChatProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const providerName = process.env.CHAT_PROVIDER || "openai";

  switch (providerName.toLowerCase()) {
    case "huggingface":
    case "hf":
      console.log(
        `Using HuggingFace chat provider with model: ${process.env.HF_MODEL || "meta-llama/Llama-3.1-8B-Instruct"}`
      );
      cachedProvider = new HuggingFaceChatProvider();
      break;
    case "openai":
    default:
      console.log(
        `Using OpenAI chat provider with model: ${process.env.OPENAI_MODEL || "gpt-4o"}`
      );
      cachedProvider = new OpenAIChatProvider();
      break;
  }

  return cachedProvider;
}

export function resetChatProvider(): void {
  cachedProvider = null;
}
