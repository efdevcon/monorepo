import { createServerClient } from "./supabase.js";
import { createEmbedding } from "./embeddings.js";
import type { MatchedDocument } from "./types.js";

export interface SearchOptions {
  matchCount?: number;
  matchThreshold?: number;
  sourceType?: string;
  sourceRepo?: string;
}

export async function searchDocuments(
  query: string,
  options: SearchOptions = {}
): Promise<MatchedDocument[]> {
  const {
    matchCount = 10,
    matchThreshold = 0.1,
    sourceType,
    sourceRepo,
  } = options;

  const supabase = createServerClient();

  // Run vector search and full-text search in parallel
  const [queryEmbedding, ftsResults] = await Promise.all([
    createEmbedding(query),
    fullTextSearch(supabase, query, { matchCount, sourceType, sourceRepo }),
  ]);

  const vectorResults = await vectorSearch(supabase, queryEmbedding, {
    matchCount,
    matchThreshold,
    sourceType,
    sourceRepo,
  });

  // Merge and deduplicate results, prioritizing FTS matches (keyword hits)
  return mergeResults(vectorResults, ftsResults, matchCount);
}

async function vectorSearch(
  supabase: ReturnType<typeof createServerClient>,
  embedding: number[],
  options: { matchCount: number; matchThreshold: number; sourceType?: string; sourceRepo?: string }
): Promise<MatchedDocument[]> {
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding,
    match_count: options.matchCount,
    match_threshold: options.matchThreshold,
    filter_source_type: options.sourceType ?? null,
    filter_source_repo: options.sourceRepo ?? null,
  } as unknown as undefined) as unknown as { data: MatchedDocument[] | null; error: Error | null };

  if (error) {
    console.error("Vector search error:", error);
    return [];
  }

  return (data ?? []).map(d => ({ ...d, matchType: "vector" as const }));
}

async function fullTextSearch(
  supabase: ReturnType<typeof createServerClient>,
  query: string,
  options: { matchCount: number; sourceType?: string; sourceRepo?: string }
): Promise<MatchedDocument[]> {
  // Extract keywords, prioritize longer/more specific words
  const stopWords = new Set(["what", "is", "the", "a", "an", "are", "how", "when", "where", "who", "which", "do", "does", "can", "could", "would", "should", "will", "to", "of", "in", "for", "on", "with", "at", "by", "from", "about", "and", "or", "but", "not", "this", "that", "these", "those", "there", "here", "have", "has", "had", "been", "being", "was", "were", "will", "would", "could", "should", "may", "might", "must", "shall", "need", "want", "like", "just", "also", "very", "really", "only", "even", "still", "already", "always", "never", "often", "sometimes", "usually", "probably", "maybe", "perhaps", "actually", "basically", "certainly", "definitely", "especially", "exactly", "generally", "likely", "simply", "specifically"]);

  const words = query
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  if (words.length === 0) {
    return [];
  }

  // Limit to top 5 most specific keywords (longer words are usually more specific)
  const topKeywords = [...words]
    .sort((a, b) => b.length - a.length)
    .slice(0, 5);

  // Create search terms: top keywords + adjacent pairs from ORIGINAL word order (for compound words)
  const searchTerms = new Set(topKeywords);

  // Add concatenated pairs from original word sequence (e.g., "table cloth" -> "tablecloth")
  for (let i = 0; i < words.length - 1; i++) {
    searchTerms.add(words[i] + words[i + 1]); // concatenated: "tablecloth"
  }

  // Cap total searches at 8
  const limitedTerms = Array.from(searchTerms).slice(0, 8);

  // Run fuzzy search for each term in parallel
  const allResults: Map<string, any> = new Map();

  await Promise.all(
    limitedTerms.map(async (term) => {
      const { data, error } = await supabase.rpc("fuzzy_search", {
        query_text: term,
        match_count: options.matchCount,
        similarity_threshold: 0.15,
        filter_source_type: options.sourceType ?? null,
        filter_source_repo: options.sourceRepo ?? null,
      } as unknown as undefined) as unknown as { data: any[] | null; error: Error | null };

      if (error || !data) return;

      for (const doc of data) {
        const existing = allResults.get(doc.id);
        if (!existing || doc.similarity > existing.similarity) {
          allResults.set(doc.id, doc);
        }
      }
    })
  );

  // Sort by similarity and return top results
  const sorted = Array.from(allResults.values()).sort((a, b) => b.similarity - a.similarity);


  return sorted.slice(0, options.matchCount).map(d => ({
    id: d.id,
    content: d.content,
    source_type: d.source_type,
    source_repo: d.source_repo,
    source_id: d.source_id,
    metadata: d.metadata,
    similarity: d.similarity,
    matchType: "fuzzy" as const,
  }));
}

function mergeResults(
  vectorResults: MatchedDocument[],
  ftsResults: MatchedDocument[],
  limit: number
): MatchedDocument[] {
  const seen = new Set<string>();
  const merged: MatchedDocument[] = [];

  // Add FTS results first (keyword matches are usually more relevant)
  for (const doc of ftsResults) {
    if (!seen.has(doc.id)) {
      seen.add(doc.id);
      merged.push(doc);
    }
  }

  // Add vector results that weren't in FTS
  for (const doc of vectorResults) {
    if (!seen.has(doc.id)) {
      seen.add(doc.id);
      merged.push(doc);
    }
  }

  return merged.slice(0, limit);
}

export function formatDocumentsForContext(documents: MatchedDocument[]): string {
  if (documents.length === 0) {
    return "No relevant documents found.";
  }

  return documents
    .map((doc, i) => {
      const title = (doc.metadata as { title?: string })?.title || doc.source_id;
      return `[${i + 1}] ${title}\nSource: ${doc.source_type}${doc.source_repo ? `/${doc.source_repo}` : ""}\n${doc.content}`;
    })
    .join("\n\n---\n\n");
}
