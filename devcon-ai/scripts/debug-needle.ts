#!/usr/bin/env npx tsx
/**
 * Debug script to check if a specific phrase exists in the DB
 * and why it might not be returned by search
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const NEEDLE = "eth is money";
const QUERY = process.argv[2] || "what is the secret";

async function main() {
  // 1. Check if the needle text exists in any document
  console.log("\n--- 1. Checking if needle exists in DB ---");
  const { data: matchingDocs, error: searchErr } = await supabase
    .from("documents")
    .select("source_id, content, metadata")
    .ilike("content", `%${NEEDLE}%`);

  if (searchErr) {
    console.error("DB query error:", searchErr);
    return;
  }

  if (!matchingDocs || matchingDocs.length === 0) {
    console.log("NEEDLE NOT FOUND IN DATABASE!");
    console.log("The chunk containing this text was not synced.");
    return;
  }

  console.log(`Found ${matchingDocs.length} chunk(s) containing the needle:`);
  for (const doc of matchingDocs) {
    const meta = doc.metadata as any;
    console.log(`  - ${doc.source_id} (chunk ${meta.chunk_index}/${meta.total_chunks})`);
    // Show snippet around the needle
    const idx = doc.content.indexOf(NEEDLE);
    if (idx >= 0) {
      const start = Math.max(0, idx - 50);
      const end = Math.min(doc.content.length, idx + NEEDLE.length + 50);
      console.log(`    ...${doc.content.slice(start, end)}...`);
    }
  }

  // 2. Test vector similarity
  console.log("\n--- 2. Testing vector similarity ---");
  const embeddingResp = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: QUERY,
    dimensions: 1536,
  });
  const queryEmbedding = embeddingResp.data[0].embedding;

  const { data: vectorResults, error: vecErr } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_count: 20,
    match_threshold: 0.0, // No threshold - show everything
    filter_source_type: null,
    filter_source_repo: null,
  }) as any;

  if (vecErr) {
    console.error("Vector search error:", vecErr);
  } else {
    // Check if any of the vector results contain the needle
    const needleResult = vectorResults?.find((r: any) => r.content?.includes(NEEDLE));
    if (needleResult) {
      console.log(`Needle found in vector results!`);
      console.log(`  source_id: ${needleResult.source_id}`);
      console.log(`  similarity: ${needleResult.similarity}`);
      // Find its rank
      const rank = vectorResults.indexOf(needleResult) + 1;
      console.log(`  rank: ${rank}/${vectorResults.length}`);
    } else {
      console.log("Needle NOT in top 20 vector results");
      console.log("Top 5 vector results:");
      for (const r of vectorResults?.slice(0, 5) || []) {
        console.log(`  ${r.source_id} (similarity: ${r.similarity})`);
      }
    }
  }

  // 3. Test fuzzy search
  console.log("\n--- 3. Testing fuzzy search ---");
  const keywords = ["secret", "eth", "money"];
  for (const keyword of keywords) {
    const { data: fuzzyResults, error: fuzzyErr } = await supabase.rpc("fuzzy_search", {
      query_text: keyword,
      match_count: 5,
      similarity_threshold: 0.05, // Very low threshold
      filter_source_type: null,
      filter_source_repo: null,
    }) as any;

    if (fuzzyErr) {
      console.error(`Fuzzy search error for "${keyword}":`, fuzzyErr);
      continue;
    }

    const needleHit = fuzzyResults?.find((r: any) => r.content?.includes(NEEDLE));
    console.log(`  "${keyword}": ${fuzzyResults?.length || 0} results${needleHit ? ` (NEEDLE at similarity ${needleHit.similarity})` : " (needle not found)"}`);
  }
}

main().catch(console.error);
