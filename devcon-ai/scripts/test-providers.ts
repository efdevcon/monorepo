#!/usr/bin/env npx tsx
/**
 * Test script to validate chat provider configuration
 *
 * Usage:
 *   pnpm test:providers           # Uses CHAT_PROVIDER from .env
 *   CHAT_PROVIDER=openai pnpm test:providers
 *   CHAT_PROVIDER=huggingface pnpm test:providers
 */

import "dotenv/config";
import {
  getChatProvider,
  resetChatProvider,
  type ChatMessage,
} from "../src/lib/providers/index.js";

async function testProvider() {
  const providerName = process.env.CHAT_PROVIDER || "openai";
  console.log(`\n🧪 Testing chat provider: ${providerName}\n`);

  // Reset cached provider to ensure fresh instance
  resetChatProvider();

  try {
    const provider = getChatProvider();
    console.log(`✓ Provider initialized: ${provider.name}`);

    // Test 1: Simple completion
    console.log("\n--- Test 1: Simple Completion ---");
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: "You are a helpful assistant. Be very brief.",
      },
      { role: "user", content: "What is 2+2? Answer in one word." },
    ];

    const response = await provider.createCompletion({
      messages,
      maxTokens: 50,
    });

    console.log(`✓ Response received`);
    console.log(`  Content: ${response.message.content}`);
    console.log(`  Finish reason: ${response.finishReason}`);

    // Test 2: Streaming
    console.log("\n--- Test 2: Streaming ---");
    const streamMessages: ChatMessage[] = [
      {
        role: "system",
        content: "You are a helpful assistant. Be very brief.",
      },
      { role: "user", content: "Count from 1 to 5." },
    ];

    process.stdout.write("  Streamed: ");
    const stream = provider.createStreamingCompletion({
      messages: streamMessages,
      maxTokens: 100,
    });

    for await (const chunk of stream) {
      if (chunk.type === "text" && chunk.text) {
        process.stdout.write(chunk.text);
      }
    }
    console.log("\n✓ Streaming complete");

    // Test 3: Tool calling (optional - may not be supported by all models)
    console.log("\n--- Test 3: Tool Calling ---");
    const toolMessages: ChatMessage[] = [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Search for information about Ethereum." },
    ];

    try {
      const toolResponse = await provider.createCompletion({
        messages: toolMessages,
        tools: [
          {
            type: "function",
            function: {
              name: "search_knowledge_base",
              description: "Search for information",
              parameters: {
                type: "object",
                properties: {
                  query: { type: "string", description: "Search query" },
                },
                required: ["query"],
              },
            },
          },
        ],
        toolChoice: "auto",
        maxTokens: 200,
      });

      if (
        toolResponse.message.tool_calls &&
        toolResponse.message.tool_calls.length > 0
      ) {
        console.log(`✓ Tool call received`);
        for (const tc of toolResponse.message.tool_calls) {
          console.log(`  Tool: ${tc.function.name}`);
          console.log(`  Args: ${tc.function.arguments}`);
        }
      } else {
        console.log(
          `⚠ No tool call returned (model may not support tool calling)`
        );
        console.log(`  Response: ${toolResponse.message.content?.slice(0, 100)}...`);
      }
    } catch (error) {
      console.log(`⚠ Tool calling not supported or failed`);
      console.log(`  Error: ${error instanceof Error ? error.message : error}`);
    }

    console.log("\n✅ All tests passed!\n");
  } catch (error) {
    console.error("\n❌ Test failed:");
    console.error(error);
    process.exit(1);
  }
}

testProvider();
