/**
 * RAG Document Sync Script
 *
 * Syncs markdown files from specified repositories to Supabase vector store.
 * Run via GitHub Actions on push, or manually via CLI.
 *
 * Usage:
 *   npx tsx scripts/sync-documents.ts --source-type github --source-repo devcon --path ./content
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// Configuration
const CHUNK_SIZE = 1500; // Characters per chunk
const CHUNK_OVERLAP = 200; // Overlap between chunks

interface DocumentChunk {
  content: string;
  sourceType: string;
  sourceRepo: string;
  sourceId: string;
  sourceHash: string;
  metadata: Record<string, unknown>;
}

// Parse command line arguments
function parseArgs(): {
  sourceType: string;
  sourceRepo: string;
  basePath: string;
  force: boolean;
} {
  const args = process.argv.slice(2);
  let sourceType = "github";
  let sourceRepo = "";
  let basePath = ".";
  let force = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--source-type" && args[i + 1]) {
      sourceType = args[i + 1];
      i++;
    } else if (args[i] === "--source-repo" && args[i + 1]) {
      sourceRepo = args[i + 1];
      i++;
    } else if (args[i] === "--path" && args[i + 1]) {
      basePath = args[i + 1];
      i++;
    } else if (args[i] === "--force") {
      force = true;
    }
  }

  if (!sourceRepo) {
    console.error("Error: --source-repo is required");
    process.exit(1);
  }

  return { sourceType, sourceRepo, basePath, force };
}

// Find all markdown files recursively
function findMarkdownFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip common non-content directories
        if (!["node_modules", ".git", ".next", "dist", "build"].includes(entry.name)) {
          walk(fullPath);
        }
      } else if (entry.isFile() && /\.(md|mdx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

// Extract frontmatter and content from markdown
function parseMarkdown(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
  rawFrontmatter: string;
} {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    return { frontmatter: {}, body: content, rawFrontmatter: '' };
  }

  const frontmatterStr = frontmatterMatch[1];
  const body = frontmatterMatch[2];

  // Simple YAML parser for basic key-value pairs (for metadata)
  const frontmatter: Record<string, unknown> = {};
  const lines = frontmatterStr.split("\n");

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      let value: unknown = match[2].trim();
      if (
        typeof value === 'string' &&
        ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = (value as string).slice(1, -1);
      }
      frontmatter[match[1]] = value;
    }
  }

  // Clean up the raw frontmatter for embedding - remove YAML syntax noise
  const rawFrontmatter = frontmatterStr
    .replace(/^(\s*)-\s+/gm, '') // Remove list markers
    .replace(/^\s*\w+:\s*[>|]\s*$/gm, '') // Remove YAML block indicators
    .replace(/^\s*\w+:\s*$/gm, '') // Remove empty key lines
    .replace(/\\_/g, ' ') // Remove escaped underscores
    .replace(/\\n/g, '\n') // Convert escaped newlines
    .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
    .trim();

  return { frontmatter, body, rawFrontmatter };
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

// Create content hash for change detection
function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

// Process a single file into document chunks
function processFile(
  filePath: string,
  basePath: string,
  sourceType: string,
  sourceRepo: string
): DocumentChunk[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const relativePath = path.relative(basePath, filePath);
  const { frontmatter, body, rawFrontmatter } = parseMarkdown(content);

  const title = (frontmatter.title as string) || path.basename(filePath, path.extname(filePath));

  // Combine raw frontmatter with body - frontmatter often contains the actual content
  const fullContent = [rawFrontmatter, body].filter(Boolean).join('\n\n');

  console.log(`Processing ${relativePath}: ${fullContent.length} chars`);

  const chunks = chunkContent(fullContent, title);

  return chunks.map((chunk, index) => ({
    content: chunk,
    sourceType,
    sourceRepo,
    sourceId: chunks.length > 1 ? `${relativePath}#chunk-${index}` : relativePath,
    sourceHash: hashContent(chunk), // Hash each chunk, not full file
    metadata: {
      title,
      file_path: relativePath,
      chunk_index: index,
      total_chunks: chunks.length,
      ...frontmatter,
    },
  }));
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
  const { sourceType, sourceRepo, basePath, force } = parseArgs();

  console.log(`Syncing documents from ${basePath}`);
  console.log(`Source: ${sourceType}/${sourceRepo}`);

  // Initialize clients
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  // Find all markdown files
  const files = findMarkdownFiles(basePath);
  console.log(`Found ${files.length} markdown files`);

  if (files.length === 0) {
    console.log("No files to process");
    return;
  }

  // Process files into chunks
  const allChunks: DocumentChunk[] = [];
  for (const file of files) {
    const chunks = processFile(file, basePath, sourceType, sourceRepo);
    allChunks.push(...chunks);
  }
  console.log(`Created ${allChunks.length} chunks from ${files.length} files`);

  // Check which chunks need updating
  const { data: existingDocs } = await supabase
    .from("documents")
    .select("source_id, source_hash")
    .eq("source_type", sourceType)
    .eq("source_repo", sourceRepo);

  const existingMap = new Map(
    (existingDocs || []).map((d) => [d.source_id, d.source_hash])
  );

  const chunksToUpsert = force
    ? allChunks // Force mode: re-sync everything
    : allChunks.filter(
        (chunk) => existingMap.get(chunk.sourceId) !== chunk.sourceHash
      );

  console.log(`${chunksToUpsert.length} chunks need updating${force ? " (force mode)" : ""}`);

  if (chunksToUpsert.length === 0) {
    console.log("All documents are up to date");
    return;
  }

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

  // Clean up old chunks that no longer exist
  const currentSourceIds = new Set(allChunks.map((c) => c.sourceId));
  const sourceIdsToDelete = [...existingMap.keys()].filter(
    (id) => !currentSourceIds.has(id)
  );

  if (sourceIdsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("source_type", sourceType)
      .eq("source_repo", sourceRepo)
      .in("source_id", sourceIdsToDelete);

    if (deleteError) {
      console.error("Error deleting old documents:", deleteError);
    } else {
      console.log(`Deleted ${sourceIdsToDelete.length} old documents`);
    }
  }
}

sync().catch((error) => {
  console.error("Sync failed:", error);
  process.exit(1);
});
