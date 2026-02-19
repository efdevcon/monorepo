import OpenAI from "openai";
import type {
  ChatProvider,
  ChatCompletionOptions,
  ChatCompletionResponse,
  StreamChunk,
  ChatMessage,
  ToolDefinition,
} from "./types.js";

export class OpenAIChatProvider implements ChatProvider {
  name = "openai";
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.model = process.env.OPENAI_MODEL || "gpt-4o";
  }

  async createCompletion(
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: this.convertMessages(options.messages),
      tools: options.tools as OpenAI.ChatCompletionTool[] | undefined,
      tool_choice: options.toolChoice,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature,
    });

    const message = response.choices[0]?.message;
    if (!message) {
      throw new Error("No response message from OpenAI");
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
      finishReason: this.mapFinishReason(response.choices[0]?.finish_reason),
    };
  }

  async *createStreamingCompletion(
    options: ChatCompletionOptions
  ): AsyncIterable<StreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: this.convertMessages(options.messages),
      tools: options.tools as OpenAI.ChatCompletionTool[] | undefined,
      tool_choice: options.toolChoice,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        yield { type: "text", text: delta.content };
      }
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.function?.name) {
            yield {
              type: "tool_call_start",
              toolCall: {
                id: tc.id,
                type: "function",
                function: {
                  name: tc.function.name,
                  arguments: tc.function.arguments || "",
                },
              },
            };
          } else if (tc.function?.arguments) {
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
    }
    yield { type: "done" };
  }

  private convertMessages(
    messages: ChatMessage[]
  ): OpenAI.ChatCompletionMessageParam[] {
    return messages.map((msg) => {
      if (msg.role === "tool") {
        return {
          role: "tool" as const,
          content: msg.content || "",
          tool_call_id: msg.tool_call_id!,
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
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content || "",
      };
    });
  }

  private mapFinishReason(
    reason: string | null | undefined
  ): ChatCompletionResponse["finishReason"] {
    switch (reason) {
      case "stop":
        return "stop";
      case "tool_calls":
        return "tool_calls";
      case "length":
        return "length";
      case "content_filter":
        return "content_filter";
      default:
        return null;
    }
  }
}
