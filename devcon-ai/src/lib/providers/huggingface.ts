import type {
  ChatProvider,
  ChatCompletionOptions,
  ChatCompletionResponse,
  StreamChunk,
  ChatMessage,
  ToolCall,
} from "./types.js";

interface HFChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: HFToolCall[];
  tool_call_id?: string;
}

interface HFToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface HFTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface HFCompletionResponse {
  choices: Array<{
    message: {
      role: "assistant";
      content: string | null;
      tool_calls?: HFToolCall[];
    };
    finish_reason: string | null;
  }>;
}

interface HFStreamChunk {
  choices: Array<{
    delta: {
      role?: string;
      content?: string | null;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason: string | null;
  }>;
}

export class HuggingFaceChatProvider implements ChatProvider {
  name = "huggingface";
  private apiToken: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    const token = process.env.HF_API_TOKEN;
    if (!token) {
      throw new Error("HF_API_TOKEN environment variable is required");
    }
    this.apiToken = token;
    this.model = process.env.HF_MODEL || "meta-llama/Llama-3.1-8B-Instruct";
    this.baseUrl = "https://router.huggingface.co/v1/chat/completions";
  }

  async createCompletion(
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResponse> {
    const body = this.buildRequestBody(options, false);

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HuggingFace API error: ${response.status} - ${errorText}`
      );
    }

    const data = (await response.json()) as HFCompletionResponse;
    const message = data.choices[0]?.message;

    if (!message) {
      throw new Error("No response message from HuggingFace");
    }

    return {
      message: {
        role: "assistant",
        content: message.content,
        tool_calls: message.tool_calls?.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
      },
      finishReason: this.mapFinishReason(data.choices[0]?.finish_reason),
    };
  }

  async *createStreamingCompletion(
    options: ChatCompletionOptions
  ): AsyncIterable<StreamChunk> {
    const body = this.buildRequestBody(options, true);
    const bodyStr = JSON.stringify(body);

    console.log("HF streaming request - body size:", bodyStr.length, "chars");
    console.log("HF streaming request - model:", this.model);

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: bodyStr,
    });

    console.log("HF response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HuggingFace API error: ${response.status} - ${errorText}`
      );
    }

    if (!response.body) {
      throw new Error("No response body from HuggingFace");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const toolCallsInProgress: Map<number, Partial<ToolCall>> = new Map();

    let totalChunks = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("HF stream ended, total chunks parsed:", totalChunks);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith("data: ")) continue;

          const data = trimmedLine.slice(6);
          if (data === "[DONE]") {
            console.log("HF stream [DONE], total chunks:", totalChunks);
            yield { type: "done" };
            return;
          }

          try {
            const chunk = JSON.parse(data) as HFStreamChunk;
            const delta = chunk.choices[0]?.delta;
            totalChunks++;

            if (delta?.content) {
              yield { type: "text", text: delta.content };
            }

            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const index = tc.index;
                let toolCall = toolCallsInProgress.get(index);

                if (tc.id && tc.function?.name) {
                  // Start of a new tool call
                  toolCall = {
                    id: tc.id,
                    type: "function",
                    function: {
                      name: tc.function.name,
                      arguments: tc.function.arguments || "",
                    },
                  };
                  toolCallsInProgress.set(index, toolCall);
                  yield {
                    type: "tool_call_start",
                    toolCall: toolCall,
                  };
                } else if (tc.function?.arguments && toolCall) {
                  // Continuation of arguments
                  if (toolCall.function) {
                    toolCall.function.arguments += tc.function.arguments;
                  }
                  yield {
                    type: "tool_call_delta",
                    toolCall: {
                      function: {
                        name: "",
                        arguments: tc.function.arguments,
                      },
                    },
                  };
                }
              }
            }
          } catch {
            // Skip invalid JSON chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { type: "done" };
  }

  private buildRequestBody(
    options: ChatCompletionOptions,
    stream: boolean
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: this.convertMessages(options.messages),
      max_tokens: options.maxTokens ?? 2048,
      stream,
    };

    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    // Only include tools if provided - many HF models have limited tool support
    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools.map((tool) => ({
        type: "function",
        function: {
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters,
        },
      })) as HFTool[];

      if (options.toolChoice) {
        body.tool_choice = options.toolChoice;
      }
    }

    return body;
  }

  private convertMessages(messages: ChatMessage[]): HFChatMessage[] {
    return messages.map((msg) => {
      if (msg.role === "tool") {
        return {
          role: "tool" as const,
          content: msg.content,
          tool_call_id: msg.tool_call_id,
        };
      }
      if (msg.role === "assistant" && msg.tool_calls) {
        return {
          role: "assistant" as const,
          content: msg.content,
          tool_calls: msg.tool_calls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
        };
      }
      return {
        role: msg.role,
        content: msg.content,
      };
    });
  }

  private mapFinishReason(
    reason: string | null | undefined
  ): ChatCompletionResponse["finishReason"] {
    switch (reason) {
      case "stop":
      case "eos_token":
        return "stop";
      case "tool_calls":
        return "tool_calls";
      case "length":
      case "max_tokens":
        return "length";
      default:
        return null;
    }
  }
}
