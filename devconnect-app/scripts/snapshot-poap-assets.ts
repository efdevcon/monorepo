#!/usr/bin/env tsx

/**
 * Snapshot POAP drop artwork referenced by the app, because the POAP project
 * (poap.tech / poap.xyz, including the assets.poap.xyz CDN) is shutting down.
 *
 * Downloads every quest poapImageLink from src/data/quests.ts (assets.poap.xyz)
 * -> public/images/poaps/<dropId>.<ext>
 *
 * Files are keyed by POAP drop id (the quest's conditionValues), matching the
 * poap.in artwork mirror (https://media.poap.in/snapshots/<v>/artwork/<id>.webp)
 * and the mints snapshot in discounts/inputs/devconnect-arg/.
 *
 * Leaderboard avatars are NOT snapshotted: src/data/leaderboard.ts points at
 * the ENS metadata service (https://metadata.ens.domains/mainnet/avatar/<ens>),
 * which resolves avatars dynamically and is independent of POAP infrastructure.
 *
 * The quests data file itself is not rewritten; swapping the URLs to the local
 * copies is a separate follow-up.
 *
 * Usage: npx tsx scripts/snapshot-poap-assets.ts
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUESTS_FILE = path.join(__dirname, '..', 'src', 'data', 'quests.ts');
const POAPS_DIR = path.join(__dirname, '..', 'public', 'images', 'poaps');

// Artwork worth keeping that no quest references (missing from media.poap.in):
// Devconnect Amsterdam attendee drop and an unminted crypto-payment drop.
const EXTRA_DROPS: Array<{ id: number; url: string }> = [
  { id: 36029, url: 'https://assets.poap.xyz/devconnect-co-work-space-2022-logo-1648583508131.png' },
  { id: 213893, url: 'https://assets.poap.xyz/i-paid-with-crypto-at-barreto-2025-logo-1762804998118.png' },
];

async function fileExists(file: string): Promise<boolean> {
  try {
    const stat = await fs.stat(file);
    return stat.size > 0;
  } catch {
    return false;
  }
}

async function download(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) {
      console.warn(`  ⚠️  HTTP ${response.status} for ${url}`);
      return null;
    }
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    console.warn(`  ⚠️  Failed to fetch ${url}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/** Pair each verifyPoap quest's drop id (conditionValues) with its poapImageLink. */
async function collectDropImages(): Promise<Array<{ id: number; url: string }>> {
  const source = await fs.readFile(QUESTS_FILE, 'utf-8');
  const images = new Map<number, string>(EXTRA_DROPS.map(d => [d.id, d.url]));

  // Quest objects are generated JSON: split per object and pull the two fields.
  for (const block of source.split(/\n  \{/)) {
    const dropId = block.match(/"conditionType":\s*"verifyPoap"[\s\S]*?"conditionValues":\s*"(\d+)"/)?.[1];
    const url = block.match(/"poapImageLink":\s*"(https:\/\/assets\.poap\.xyz\/[^"]+)"/)?.[1];
    if (dropId && url) images.set(parseInt(dropId), url);
  }
  return [...images.entries()]
    .map(([id, url]) => ({ id, url }))
    .sort((a, b) => a.id - b.id);
}

async function snapshotQuestImages(): Promise<void> {
  const drops = await collectDropImages();
  console.log(`Drop artwork: ${drops.length} drops referenced (incl. ${EXTRA_DROPS.length} extras)`);

  await fs.mkdir(POAPS_DIR, { recursive: true });
  let ok = 0;
  for (const { id, url } of drops) {
    const ext = path.extname(new URL(url).pathname) || '.png';
    const file = path.join(POAPS_DIR, `${id}${ext}`);
    if (await fileExists(file)) {
      ok++;
      continue;
    }
    const buffer = await download(url);
    if (!buffer) continue;
    await fs.writeFile(file, buffer);
    ok++;
    await new Promise(r => setTimeout(r, 100));
  }
  console.log(`✅ Drop artwork: ${ok}/${drops.length} in ${POAPS_DIR}`);
}

snapshotQuestImages().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
