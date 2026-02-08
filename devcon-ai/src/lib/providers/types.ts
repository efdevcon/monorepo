// Chat provider abstraction types

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  toolChoice?: "auto" | "none" | "required";
  maxTokens?: number;
  temperature?: number;
}

export interface ChatCompletionResponse {
  message: {
    role: "assistant";
    content: string | null;
    tool_calls?: ToolCall[];
  };
  finishReason: "stop" | "tool_calls" | "length" | "content_filter" | null;
}

export interface StreamChunk {
  type: "text" | "tool_call_start" | "tool_call_delta" | "done";
  text?: string;
  toolCall?: Partial<ToolCall>;
}

export interface ChatProvider {
  name: string;
  createCompletion(
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResponse>;
  createStreamingCompletion(
    options: ChatCompletionOptions
  ): AsyncIterable<StreamChunk>;
}
