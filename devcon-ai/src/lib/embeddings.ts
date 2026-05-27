import OpenAI from "openai";

// Pinned to real OpenAI — the SDK will silently inherit OPENAI_BASE_URL from
// the environment if we leave baseURL undefined, which would send embedding
// requests (with the OpenAI key) to whatever chat endpoint is configured.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.openai.com/v1",
});

export async function createEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    dimensions: 1536,
  });

  return response.data[0].embedding;
}

export async function createEmbeddings(
  texts: string[]
): Promise<{ text: string; embedding: number[] }[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
    dimensions: 1536,
  });

  return texts.map((text, i) => ({
    text,
    embedding: response.data[i].embedding,
  }));
}
