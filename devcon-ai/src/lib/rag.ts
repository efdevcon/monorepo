import { createServerClient } from "./supabase.js";
import { createEmbedding } from "./embeddings.js";
import type { MatchedDocument } from "./types.js";

export interface SearchOptions {
  matchCount?: number;
  matchThreshold?: number;
  sourceType?: string;
  sourceRepo?: string;
  expandToFullDocuments?: boolean;
  maxDocuments?: number;
}

export interface ExpandedDocument {
  filePath: string;
  title: string;
  content: string;
  sourceType: string;
  sourceRepo: string | null;
  similarity: number;
  metadata: Record<string, unknown>;
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

  // Run vector search, fuzzy search, and exact text search in parallel
  const [queryEmbedding, ftsResults, exactResults] = await Promise.all([
    createEmbedding(query),
    fullTextSearch(supabase, query, { matchCount, sourceType, sourceRepo }),
    exactTextSearch(supabase, query, { matchCount, sourceType, sourceRepo }),
  ]);

  const vectorResults = await vectorSearch(supabase, queryEmbedding, {
    matchCount,
    matchThreshold,
    sourceType,
    sourceRepo,
  });

  // Debug logging
  console.log(
    `Vector results (${vectorResults.length}):`,
    vectorResults
      .slice(0, 3)
      .map((d) => ({ id: d.source_id, similarity: d.similarity }))
  );
  console.log(
    `Fuzzy results (${ftsResults.length}):`,
    ftsResults
      .slice(0, 3)
      .map((d) => ({ id: d.source_id, similarity: d.similarity }))
  );
  console.log(
    `Exact results (${exactResults.length}):`,
    exactResults
      .slice(0, 3)
      .map((d) => ({ id: d.source_id, similarity: d.similarity }))
  );

  // Merge: exact matches first, then fuzzy, then vector
  return mergeResults3(exactResults, ftsResults, vectorResults, matchCount);
}

interface ChunkExpansionOptions {
  chunksBefore?: number;
  chunksAfter?: number;
  maxCharsPerDocument?: number;
}

/**
 * Search for documents and expand matched chunks with surrounding context.
 * Instead of fetching full documents, fetches N chunks before/after the match.
 */
export async function searchAndExpandDocuments(
  query: string,
  options: SearchOptions = {},
  expansionOptions: ChunkExpansionOptions = {}
): Promise<ExpandedDocument[]> {
  const { maxDocuments = 5, sourceType, sourceRepo } = options;
  const {
    chunksBefore = 2,
    chunksAfter = 2,
    maxCharsPerDocument = 6000,
  } = expansionOptions;

  // First, find matching chunks
  const matchedChunks = await searchDocuments(query, {
    ...options,
    matchCount: 20,
  });

  if (matchedChunks.length === 0) {
    return [];
  }

  const supabase = createServerClient();

  interface DocumentRow {
    id: string;
    content: string;
    source_type: string;
    source_repo: string | null;
    source_id: string;
    metadata: Record<string, unknown>;
  }

  // Expand each matched chunk independently, then deduplicate overlapping regions
  // This ensures a vector match at chunk 316 isn't lost because fuzzy found chunk 290 in the same file
  const expandedDocs: ExpandedDocument[] = [];
  const expandedRegions = new Set<string>(); // "filePath:chunkIndex" to avoid duplicate regions

  // Take top chunks by similarity (already sorted by mergeResults3)
  const topChunks = matchedChunks.slice(0, maxDocuments * 2);

  for (const chunk of topChunks) {
    if (expandedDocs.length >= maxDocuments) break;

    const filePath = getFilePath(chunk);
    const chunkIndex = getChunkIndex(chunk);

    // Check if this region was already expanded (overlapping with a previous expansion)
    const regionKey = `${filePath}:${chunkIndex}`;
    if (expandedRegions.has(regionKey)) continue;

    // Mark this region and nearby chunks as expanded
    const minIndex = Math.max(0, chunkIndex - chunksBefore);
    const maxIndex = chunkIndex + chunksAfter;
    for (let i = minIndex; i <= maxIndex; i++) {
      expandedRegions.add(`${filePath}:${i}`);
    }

    // Query chunks for this file path
    let queryBuilder = supabase
      .from("documents")
      .select("id, content, source_type, source_repo, source_id, metadata")
      .or(`source_id.eq.${filePath},source_id.like.${filePath}#chunk-%`);

    if (sourceType) {
      queryBuilder = queryBuilder.eq("source_type", sourceType);
    }

    const { data: allChunks, error } = (await queryBuilder.order("source_id", {
      ascending: true,
    })) as unknown as {
      data: DocumentRow[] | null;
      error: Error | null;
    };

    if (error || !allChunks || allChunks.length === 0) {
      // Fallback: just use the matched chunk itself
      expandedDocs.push({
        filePath: `${filePath}#${chunkIndex}`,
        title:
          (chunk.metadata as { title?: string })?.title || chunk.source_id,
        content: chunk.content,
        sourceType: chunk.source_type,
        sourceRepo: chunk.source_repo,
        similarity: chunk.similarity,
        metadata: chunk.metadata,
      });
      continue;
    }

    // Filter by source_repo if specified
    const filteredChunks = sourceRepo
      ? allChunks.filter((c) => c.source_repo === sourceRepo)
      : allChunks;

    if (filteredChunks.length === 0) continue;

    // Sort by chunk_index and filter to our range
    const sortedChunks = filteredChunks
      .map((c) => ({
        ...c,
        chunkIndex: (c.metadata as { chunk_index?: number })?.chunk_index ?? 0,
      }))
      .sort((a, b) => a.chunkIndex - b.chunkIndex)
      .filter((c) => c.chunkIndex >= minIndex && c.chunkIndex <= maxIndex);

    if (sortedChunks.length === 0) continue;

    // Combine chunks, respecting max chars
    let content = "";
    for (const c of sortedChunks) {
      if (content.length + c.content.length > maxCharsPerDocument) {
        content += "\n\n[...truncated]";
        break;
      }
      content += (content ? "\n\n" : "") + c.content;
    }

    const firstChunk = sortedChunks[0];

    expandedDocs.push({
      filePath: `${filePath}#${chunkIndex}`,
      title: (firstChunk.metadata.title as string) || filePath,
      content,
      sourceType: firstChunk.source_type,
      sourceRepo: firstChunk.source_repo,
      similarity: chunk.similarity,
      metadata: firstChunk.metadata,
    });
  }

  console.log(
    `Expanded ${expandedDocs.length} regions from ${matchedChunks.length} chunks`
  );

  return expandedDocs;
}

/**
 * Get chunk index from metadata or source_id
 */
function getChunkIndex(chunk: MatchedDocument): number {
  const metadata = chunk.metadata as { chunk_index?: number };
  if (metadata.chunk_index !== undefined) {
    return metadata.chunk_index;
  }
  // Parse from source_id like "file.mdx#chunk-5"
  const match = chunk.source_id.match(/#chunk-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Extract the base file path from a chunk's source_id or metadata
 */
function getFilePath(chunk: MatchedDocument): string {
  // Try metadata.file_path first
  const metadata = chunk.metadata as { file_path?: string };
  if (metadata.file_path) {
    return metadata.file_path;
  }

  // Fall back to parsing source_id (remove #chunk-N suffix)
  return chunk.source_id.replace(/#chunk-\d+$/, "");
}

/**
 * Combine chunks into a single document, handling overlaps
 */
function combineChunks(chunks: string[]): string {
  if (chunks.length === 0) return "";
  if (chunks.length === 1) return chunks[0];

  // Simple approach: just join with double newline
  // The chunks already have some structure, and overlap removal is complex
  // For now, we'll accept some duplication at chunk boundaries
  return chunks.join("\n\n");
}

async function vectorSearch(
  supabase: ReturnType<typeof createServerClient>,
  embedding: number[],
  options: {
    matchCount: number;
    matchThreshold: number;
    sourceType?: string;
    sourceRepo?: string;
  }
): Promise<MatchedDocument[]> {
  const { data, error } = (await supabase.rpc("match_documents", {
    query_embedding: embedding,
    match_count: options.matchCount,
    match_threshold: options.matchThreshold,
    filter_source_type: options.sourceType ?? null,
    filter_source_repo: options.sourceRepo ?? null,
  } as unknown as undefined)) as unknown as {
    data: MatchedDocument[] | null;
    error: Error | null;
  };

  if (error) {
    console.error("Vector search error:", error);
    return [];
  }

  return (data ?? []).map((d) => ({ ...d, matchType: "vector" as const }));
}

async function fullTextSearch(
  supabase: ReturnType<typeof createServerClient>,
  query: string,
  options: { matchCount: number; sourceType?: string; sourceRepo?: string }
): Promise<MatchedDocument[]> {
  // Extract keywords, prioritize longer/more specific words
  const stopWords = new Set([
    "what",
    "is",
    "the",
    "a",
    "an",
    "are",
    "how",
    "when",
    "where",
    "who",
    "which",
    "do",
    "does",
    "can",
    "could",
    "would",
    "should",
    "will",
    "to",
    "of",
    "in",
    "for",
    "on",
    "with",
    "at",
    "by",
    "from",
    "about",
    "and",
    "or",
    "but",
    "not",
    "this",
    "that",
    "these",
    "those",
    "there",
    "here",
    "have",
    "has",
    "had",
    "been",
    "being",
    "was",
    "were",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
    "shall",
    "need",
    "want",
    "like",
    "just",
    "also",
    "very",
    "really",
    "only",
    "even",
    "still",
    "already",
    "always",
    "never",
    "often",
    "sometimes",
    "usually",
    "probably",
    "maybe",
    "perhaps",
    "actually",
    "basically",
    "certainly",
    "definitely",
    "especially",
    "exactly",
    "generally",
    "likely",
    "simply",
    "specifically",
  ]);

  const words = query
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));

  if (words.length === 0) {
    return [];
  }

  // Limit to top 5 most specific keywords (longer words are usually more specific)
  const topKeywords = [...words].sort((a, b) => b.length - a.length).slice(0, 5);

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
      const { data, error } = (await supabase.rpc("fuzzy_search", {
        query_text: term,
        match_count: options.matchCount,
        similarity_threshold: 0.15,
        filter_source_type: options.sourceType ?? null,
        filter_source_repo: options.sourceRepo ?? null,
      } as unknown as undefined)) as unknown as {
        data: any[] | null;
        error: Error | null;
      };

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
  // Filter out results with similarity=1 (database function bug returns 1 for all matches)
  const sorted = Array.from(allResults.values())
    .filter((d) => d.similarity < 1)
    .sort((a, b) => b.similarity - a.similarity);

  return sorted.slice(0, options.matchCount).map((d) => ({
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

/**
 * Exact substring search using ILIKE.
 * Catches verbatim matches that vector/fuzzy miss.
 */
async function exactTextSearch(
  supabase: ReturnType<typeof createServerClient>,
  query: string,
  options: { matchCount: number; sourceType?: string; sourceRepo?: string }
): Promise<MatchedDocument[]> {
  // Only search if query has enough substance
  const trimmed = query.trim();
  if (trimmed.length < 4) {
    return [];
  }

  let queryBuilder = supabase
    .from("documents")
    .select("id, content, source_type, source_repo, source_id, metadata")
    .ilike("content", `%${trimmed}%`)
    .limit(options.matchCount);

  if (options.sourceType) {
    queryBuilder = queryBuilder.eq("source_type", options.sourceType);
  }
  if (options.sourceRepo) {
    queryBuilder = queryBuilder.eq("source_repo", options.sourceRepo);
  }

  interface DocRow {
    id: string;
    content: string;
    source_type: string;
    source_repo: string;
    source_id: string;
    metadata: Record<string, unknown>;
  }

  const { data, error } = (await queryBuilder) as unknown as {
    data: DocRow[] | null;
    error: Error | null;
  };

  if (error) {
    console.error("Exact text search error:", error);
    return [];
  }

  return (data ?? []).map((d) => ({
    id: d.id,
    content: d.content,
    source_type: d.source_type,
    source_repo: d.source_repo,
    source_id: d.source_id,
    metadata: d.metadata,
    similarity: 0.99, // Exact match gets high similarity
    matchType: "exact" as const,
  }));
}

function mergeResults3(
  exactResults: MatchedDocument[],
  ftsResults: MatchedDocument[],
  vectorResults: MatchedDocument[],
  limit: number
): MatchedDocument[] {
  // Interleave results from all methods to ensure each gets representation.
  // Fuzzy and vector use different similarity scales so we can't sort together.
  const seen = new Set<string>();
  const merged: MatchedDocument[] = [];

  const addDoc = (doc: MatchedDocument) => {
    if (!seen.has(doc.id)) {
      seen.add(doc.id);
      merged.push(doc);
    }
  };

  // Round-robin: take from each source in turn, exact first
  const sources = [exactResults, vectorResults, ftsResults];
  const indices = [0, 0, 0];

  // Exact matches all go first (they're high confidence verbatim hits)
  for (const doc of exactResults) addDoc(doc);
  indices[0] = exactResults.length;

  // Then interleave vector and fuzzy
  while (merged.length < limit) {
    let added = false;
    for (let s = 1; s < sources.length; s++) {
      if (indices[s] < sources[s].length) {
        addDoc(sources[s][indices[s]]);
        indices[s]++;
        added = true;
      }
    }
    if (!added) break;
  }

  return merged.slice(0, limit);
}

export function formatDocumentsForContext(documents: MatchedDocument[]): string {
  if (documents.length === 0) {
    return "No relevant documents found.";
  }

  return documents
    .map((doc, i) => {
      const title =
        (doc.metadata as { title?: string })?.title || doc.source_id;
      return `[${i + 1}] ${title}\nSource: ${doc.source_type}${doc.source_repo ? `/${doc.source_repo}` : ""}\n${doc.content}`;
    })
    .join("\n\n---\n\n");
}

// Max context size in characters (~4 chars per token, target ~8K tokens)
const MAX_CONTEXT_CHARS = 24000;

export function formatExpandedDocumentsForContext(
  documents: ExpandedDocument[],
  maxChars: number = MAX_CONTEXT_CHARS
): string {
  if (documents.length === 0) {
    return "No relevant documents found.";
  }

  const result: string[] = [];
  let totalChars = 0;

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const header = `[${i + 1}] ${doc.title}\nSource: ${doc.sourceType}${doc.sourceRepo ? `/${doc.sourceRepo}` : ""}\nRelevance: ${Math.round(doc.similarity * 100)}%\n\n`;

    // Calculate how much space we have for this document's content
    const separatorLen = result.length > 0 ? 7 : 0; // "\n\n---\n\n"
    const availableForContent = maxChars - totalChars - header.length - separatorLen;

    if (availableForContent <= 0) {
      // No more room
      break;
    }

    // Truncate content if needed
    let content = doc.content;
    if (content.length > availableForContent) {
      content = content.slice(0, availableForContent - 20) + "\n\n[...truncated]";
    }

    const docText = header + content;
    result.push(docText);
    totalChars += docText.length + separatorLen;

    if (totalChars >= maxChars) {
      break;
    }
  }

  return result.join("\n\n---\n\n");
}
