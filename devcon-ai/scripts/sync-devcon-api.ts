/**
 * Devcon API Sessions Sync Script
 *
 * Fetches Devcon 7 sessions from the API and embeds them into the RAG knowledge base.
 *
 * Usage:
 *   pnpm sync:devcon-api
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import * as crypto from "crypto";

// Configuration
const CHUNK_SIZE = 1500; // Characters per chunk
const CHUNK_OVERLAP = 200; // Overlap between chunks
const API_URL = "https://api.devcon.org/sessions?event=devcon-7&size=1000";
const SOURCE_TYPE = "devcon-api";
const SOURCE_REPO = "devcon-7";

interface Speaker {
  name: string;
}

interface Room {
  name: string;
}

interface Session {
  id: string;
  title: string;
  description: string;
  type: string;
  track: string;
  expertise: string;
  speakers: Speaker[];
  tags: string;
  slot_start: string;
  slot_end: string;
  slot_room: Room | null;
  sources_youtubeId: string;
}

interface ApiResponse {
  status: number;
  message: string;
  data: {
    total: number;
    currentPage: number;
    items: Session[];
  };
}

interface DocumentChunk {
  content: string;
  sourceType: string;
  sourceRepo: string;
  sourceId: string;
  sourceHash: string;
  metadata: Record<string, unknown>;
}

// Parse command line arguments
function parseArgs(): { force: boolean } {
  const args = process.argv.slice(2);
  let force = false;

  for (const arg of args) {
    if (arg === "--force") {
      force = true;
    }
  }

  return { force };
}

// Create content hash for change detection
function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

// Split content into overlapping chunks
function chunkContent(content: string, title?: string): string[] {
  const chunks: string[] = [];

  // Clean content: remove excessive whitespace but preserve structure
  const cleanContent = content
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // If content is small enough, return as single chunk
  if (cleanContent.length <= CHUNK_SIZE) {
    return [title ? `# ${title}\n\n${cleanContent}` : cleanContent];
  }

  // Split into paragraphs first
  const paragraphs = cleanContent.split(/\n\n+/);
  let currentChunk = title ? `# ${title}\n\n` : "";

  for (const paragraph of paragraphs) {
    // If adding this paragraph exceeds chunk size, save current chunk
    if (currentChunk.length + paragraph.length > CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());

      // Start new chunk with overlap from previous
      const overlap = currentChunk.slice(-CHUNK_OVERLAP);
      currentChunk = overlap + "\n\n" + paragraph;
    } else {
      currentChunk += (currentChunk.length > 0 ? "\n\n" : "") + paragraph;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Format session into embeddable content
function formatSessionContent(session: Session): string {
  const speakerNames = session.speakers?.map((s) => s.name).join("; ") || "";

  const metadataLines = [
    `Type: ${session.type || "Unknown"}`,
    session.track ? `Track: ${session.track}` : null,
    session.expertise ? `Expertise: ${session.expertise}` : null,
  ].filter(Boolean).join(" | ");

  const parts = [
    metadataLines,
    speakerNames ? `Speakers: ${speakerNames}` : null,
    session.tags ? `Tags: ${session.tags}` : null,
    "",
    session.description || "",
  ].filter((part) => part !== null);

  return parts.join("\n");
}

// Process a single session into document chunks
function processSession(session: Session): DocumentChunk[] {
  const content = formatSessionContent(session);
  const title = session.title || "Untitled Session";
  const speakerNames = session.speakers?.map((s) => s.name) || [];

  console.log(`Processing session: ${title} (${content.length} chars)`);

  const chunks = chunkContent(content, title);

  return chunks.map((chunk, index) => ({
    content: chunk,
    sourceType: SOURCE_TYPE,
    sourceRepo: SOURCE_REPO,
    sourceId: chunks.length > 1
      ? `sessions/${session.id}#chunk-${index}`
      : `sessions/${session.id}`,
    sourceHash: hashContent(chunk),
    metadata: {
      title,
      session_id: session.id,
      type: session.type || null,
      track: session.track || null,
      expertise: session.expertise || null,
      speakers: speakerNames,
      tags: session.tags || null,
      slot_start: session.slot_start || null,
      slot_end: session.slot_end || null,
      room: session.slot_room?.name || null,
      youtube_id: session.sources_youtubeId || null,
      chunk_index: index,
      total_chunks: chunks.length,
    },
  }));
}

// Fetch sessions from Devcon API
async function fetchSessions(): Promise<Session[]> {
  console.log(`Fetching sessions from ${API_URL}`);

  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data: ApiResponse = await response.json();

  if (!data.data?.items || !Array.isArray(data.data.items)) {
    throw new Error("Invalid API response: expected data.items array");
  }

  return data.data.items;
}

// Create embeddings for chunks
async function createEmbeddings(
  openai: OpenAI,
  chunks: DocumentChunk[]
): Promise<(DocumentChunk & { embedding: number[] })[]> {
  const batchSize = 100; // OpenAI limit
  const results: (DocumentChunk & { embedding: number[] })[] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch.map((c) => c.content),
      dimensions: 1536,
    });

    for (let j = 0; j < batch.length; j++) {
      results.push({
        ...batch[j],
        embedding: response.data[j].embedding,
      });
    }

    console.log(`Created embeddings: ${results.length}/${chunks.length}`);
  }

  return results;
}

// Main sync function
async function sync() {
  const { force } = parseArgs();

  console.log(`Syncing Devcon 7 sessions from API`);
  console.log(`Source: ${SOURCE_TYPE}/${SOURCE_REPO}`);

  // Initialize clients
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  // Fetch sessions from API
  const sessions = await fetchSessions();
  console.log(`Found ${sessions.length} sessions`);

  if (sessions.length === 0) {
    console.log("No sessions to process");
    return;
  }

  // Process sessions into chunks
  const allChunks: DocumentChunk[] = [];
  for (const session of sessions) {
    const chunks = processSession(session);
    allChunks.push(...chunks);
  }
  console.log(`Created ${allChunks.length} chunks from ${sessions.length} sessions`);

  // Check which chunks need updating
  const { data: existingDocs } = await supabase
    .from("documents")
    .select("source_id, source_hash")
    .eq("source_type", SOURCE_TYPE)
    .eq("source_repo", SOURCE_REPO);

  const existingMap = new Map(
    (existingDocs || []).map((d) => [d.source_id, d.source_hash])
  );

  const chunksToUpsert = force
    ? allChunks // Force mode: re-sync everything
    : allChunks.filter(
        (chunk) => existingMap.get(chunk.sourceId) !== chunk.sourceHash
      );

  console.log(`${chunksToUpsert.length} chunks need updating${force ? " (force mode)" : ""}`);

  if (chunksToUpsert.length > 0) {
    // Create embeddings for new/changed chunks
    const chunksWithEmbeddings = await createEmbeddings(openai, chunksToUpsert);

    // Upsert to Supabase
    const { error } = await supabase.from("documents").upsert(
      chunksWithEmbeddings.map((chunk) => ({
        content: chunk.content,
        embedding: chunk.embedding,
        source_type: chunk.sourceType,
        source_repo: chunk.sourceRepo,
        source_id: chunk.sourceId,
        source_hash: chunk.sourceHash,
        metadata: chunk.metadata,
      })),
      {
        onConflict: "source_type,source_repo,source_id",
      }
    );

    if (error) {
      console.error("Error upserting documents:", error);
      process.exit(1);
    }

    console.log(`Successfully synced ${chunksWithEmbeddings.length} documents`);
  } else {
    console.log("All documents are up to date");
  }

  // Clean up old chunks that no longer exist (orphaned sessions)
  const currentSourceIds = new Set(allChunks.map((c) => c.sourceId));
  const sourceIdsToDelete = [...existingMap.keys()].filter(
    (id) => !currentSourceIds.has(id)
  );

  if (sourceIdsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("source_type", SOURCE_TYPE)
      .eq("source_repo", SOURCE_REPO)
      .in("source_id", sourceIdsToDelete);

    if (deleteError) {
      console.error("Error deleting old documents:", deleteError);
    } else {
      console.log(`Deleted ${sourceIdsToDelete.length} orphaned documents`);
    }
  }
}

sync().catch((error) => {
  console.error("Sync failed:", error);
  process.exit(1);
});
