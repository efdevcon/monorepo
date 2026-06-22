/**
 * Devcon Sessions Sync Script
 *
 * Embeds Devcon sessions into the RAG knowledge base, reading from the
 * committed `devcon-api/data` files (the same source of truth the API loads
 * into memory on boot) rather than the live API. Intended to run right after
 * `pnpm sync:pretalx` in the Pretalx sync workflow, so RAG stays in step with
 * the schedule data committed to the repo.
 *
 * Usage:
 *   pnpm sync:sessions [--event devcon-7] [--data-path ../devcon-api/data] [--force]
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

// Configuration
const CHUNK_SIZE = 1500; // Characters per chunk
const CHUNK_OVERLAP = 200; // Overlap between chunks
const SOURCE_TYPE = "devcon-api";
const DEFAULT_EVENT = "devcon-7";
const DEFAULT_DATA_PATH = "../devcon-api/data";

// Shape of a session as stored on disk in devcon-api/data/sessions/<event>/*.json
interface DiskSession {
  id: string;
  title?: string;
  description?: string;
  type?: string;
  track?: string;
  expertise?: string;
  tags?: string[];
  speakers?: string[]; // speaker IDs
  slot_start?: number | string | null;
  slot_end?: number | string | null;
  slot_roomId?: string | null;
  sources_youtubeId?: string;
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
function parseArgs(): { force: boolean; event: string; dataPath: string } {
  const args = process.argv.slice(2);
  let force = false;
  let event = DEFAULT_EVENT;
  let dataPath = DEFAULT_DATA_PATH;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--force") {
      force = true;
    } else if (arg === "--event") {
      event = args[++i];
    } else if (arg === "--data-path") {
      dataPath = args[++i];
    }
  }

  return { force, event, dataPath };
}

// Create content hash for change detection
function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

// Read every *.json file in a directory, parsed. Returns [] if dir is absent.
function readJsonDir<T>(dir: string): T[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as T);
}

// Build id -> name lookup from a directory of {id, name} json files
function buildNameMap(dir: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of readJsonDir<{ id: string; name?: string }>(dir)) {
    if (item.id && item.name) map.set(item.id, item.name);
  }
  return map;
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
function formatSessionContent(session: DiskSession, speakerNames: string[]): string {
  const tags = (session.tags || []).join(", ");

  const metadataLines = [
    `Type: ${session.type || "Unknown"}`,
    session.track ? `Track: ${session.track}` : null,
    session.expertise ? `Expertise: ${session.expertise}` : null,
  ].filter(Boolean).join(" | ");

  const parts = [
    metadataLines,
    speakerNames.length ? `Speakers: ${speakerNames.join("; ")}` : null,
    tags ? `Tags: ${tags}` : null,
    "",
    session.description || "",
  ].filter((part) => part !== null);

  return parts.join("\n");
}

// Process a single session into document chunks
function processSession(
  session: DiskSession,
  event: string,
  speakerMap: Map<string, string>,
  roomMap: Map<string, string>
): DocumentChunk[] {
  const speakerNames = (session.speakers || [])
    .map((id) => speakerMap.get(id) || id)
    .filter(Boolean);
  const room = session.slot_roomId ? roomMap.get(session.slot_roomId) || null : null;

  const content = formatSessionContent(session, speakerNames);
  const title = session.title || "Untitled Session";

  console.log(`Processing session: ${title} (${content.length} chars)`);

  const chunks = chunkContent(content, title);

  return chunks.map((chunk, index) => ({
    content: chunk,
    sourceType: SOURCE_TYPE,
    sourceRepo: event,
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
      tags: (session.tags || []).join(", ") || null,
      slot_start: session.slot_start ?? null,
      slot_end: session.slot_end ?? null,
      room,
      youtube_id: session.sources_youtubeId || null,
      chunk_index: index,
      total_chunks: chunks.length,
    },
  }));
}

// Load sessions for an event from the committed devcon-api data files
function loadSessions(
  dataPath: string,
  event: string
): { sessions: DiskSession[]; speakerMap: Map<string, string>; roomMap: Map<string, string> } {
  const sessionsDir = path.join(dataPath, "sessions", event);
  if (!fs.existsSync(sessionsDir)) {
    throw new Error(`Sessions directory not found: ${sessionsDir}`);
  }

  const sessions = readJsonDir<DiskSession>(sessionsDir);
  // Speakers are stored flat across all events; rooms are per-event.
  const speakerMap = buildNameMap(path.join(dataPath, "speakers"));
  const roomMap = buildNameMap(path.join(dataPath, "rooms", event));

  return { sessions, speakerMap, roomMap };
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
  const { force, event, dataPath } = parseArgs();

  console.log(`Syncing ${event} sessions into RAG`);
  console.log(`Source: ${SOURCE_TYPE}/${event} (from ${dataPath})`);

  // Initialize clients
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    // Pin to real OpenAI — the SDK otherwise inherits OPENAI_BASE_URL from the
    // env (a chat proxy in dev), which 401s on embedding requests.
    baseURL: "https://api.openai.com/v1",
  });

  // Load sessions from the committed data files
  const { sessions, speakerMap, roomMap } = loadSessions(dataPath, event);
  console.log(`Found ${sessions.length} sessions`);

  if (sessions.length === 0) {
    console.log("No sessions to process");
    return;
  }

  // Process sessions into chunks
  const allChunks: DocumentChunk[] = [];
  for (const session of sessions) {
    const chunks = processSession(session, event, speakerMap, roomMap);
    allChunks.push(...chunks);
  }
  console.log(`Created ${allChunks.length} chunks from ${sessions.length} sessions`);

  // Check which chunks need updating
  const { data: existingDocs } = await supabase
    .from("documents")
    .select("source_id, source_hash")
    .eq("source_type", SOURCE_TYPE)
    .eq("source_repo", event);

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

  // Clean up old chunks that no longer exist (orphaned/canceled sessions)
  const currentSourceIds = new Set(allChunks.map((c) => c.sourceId));
  const sourceIdsToDelete = [...existingMap.keys()].filter(
    (id) => !currentSourceIds.has(id)
  );

  if (sourceIdsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("source_type", SOURCE_TYPE)
      .eq("source_repo", event)
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
