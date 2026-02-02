import "dotenv/config";
import { searchDocuments } from "../src/lib/rag.js";

async function test() {
  const query = process.argv[2] || "what color is the tablecloth";
  console.log(`Searching for: "${query}"\n`);

  const results = await searchDocuments(query, { matchCount: 10 });

  console.log(`Found ${results.length} results:\n`);
  for (const doc of results) {
    const hasTablecloth = doc.content.toLowerCase().includes("tablecloth");
    const matchType = (doc as any).matchType || "unknown";
    console.log(`[${matchType}] ${doc.source_id} (sim: ${doc.similarity?.toFixed(3) || "n/a"})`);
    console.log(`Contains "tablecloth": ${hasTablecloth}`);
    console.log(`Preview: ${doc.content.slice(0, 150)}...`);
    console.log("");
  }
}

test();
