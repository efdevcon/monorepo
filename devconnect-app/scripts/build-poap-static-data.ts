#!/usr/bin/env tsx

/**
 * Build static POAP data from the archive snapshot in
 * ../discounts/inputs/devconnect-arg/ (taken before the POAP shutdown), so the
 * app no longer depends on the dead public.compass.poap.tech API:
 *
 *   src/data/poap-mints.json      - { dropId: { address: minted_on } }
 *                                   consumed by /api/poap (quest verification)
 *   src/data/poap-drop-stats.json - { dropId: { name, mintCount } }
 *                                   consumed by the stats page
 *   src/data/poap-images.json     - { dropId: "/images/poaps/<dropId>.<ext>" }
 *                                   consumed by /api/quests
 *
 * Also rewrites the poapImageLink of every verifyPoap quest in
 * src/data/quests.ts from assets.poap.xyz to the local
 * /images/poaps/<dropId>.<ext> snapshot.
 *
 * Usage: npx tsx scripts/build-poap-static-data.ts
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAPSHOT_DIR = path.join(__dirname, '..', '..', 'discounts', 'inputs', 'devconnect-arg');
const POAPS_DIR = path.join(__dirname, '..', 'public', 'images', 'poaps');
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const QUESTS_FILES = [path.join(DATA_DIR, 'quests.ts')];

async function buildMints(): Promise<void> {
  const mintsDir = path.join(SNAPSHOT_DIR, 'mints');
  const files = (await fs.readdir(mintsDir)).filter(f => f.endsWith('.json')).sort();

  const byDrop: Record<string, Record<string, number>> = {};
  let total = 0;
  for (const file of files) {
    const dropId = path.basename(file, '.json');
    const mints: Array<{ address: string; minted_on: number }> = JSON.parse(
      await fs.readFile(path.join(mintsDir, file), 'utf-8')
    );
    const holders: Record<string, number> = {};
    for (const { address, minted_on } of mints) {
      // An address can hold several tokens of one drop; keep the earliest mint
      if (!(address in holders) || minted_on < holders[address]) {
        holders[address] = minted_on;
      }
    }
    byDrop[dropId] = holders;
    total += Object.keys(holders).length;
  }

  const outFile = path.join(DATA_DIR, 'poap-mints.json');
  await fs.writeFile(outFile, JSON.stringify(byDrop) + '\n');
  console.log(`✅ poap-mints.json: ${files.length} drops, ${total} holders`);
}

async function buildDropStats(): Promise<void> {
  const { drops } = JSON.parse(await fs.readFile(path.join(SNAPSHOT_DIR, 'drops.json'), 'utf-8'));

  const stats: Record<string, { name: string; mintCount: number }> = {};
  for (const drop of drops) {
    stats[String(drop.id)] = {
      name: drop.name,
      mintCount: drop.stats_by_chain_aggregate?.aggregate?.sum?.poap_count || 0,
    };
  }

  const outFile = path.join(DATA_DIR, 'poap-drop-stats.json');
  await fs.writeFile(outFile, JSON.stringify(stats, null, 2) + '\n');
  console.log(`✅ poap-drop-stats.json: ${Object.keys(stats).length} drops`);
}

/** Map dropId -> /images/poaps/<dropId>.<ext> from the snapshot folder. */
async function buildImageMap(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const file of (await fs.readdir(POAPS_DIR)).sort()) {
    const dropId = path.basename(file, path.extname(file));
    if (/^\d+$/.test(dropId)) map[dropId] = `/images/poaps/${file}`;
  }

  const outFile = path.join(DATA_DIR, 'poap-images.json');
  await fs.writeFile(outFile, JSON.stringify(map, null, 2) + '\n');
  console.log(`✅ poap-images.json: ${Object.keys(map).length} drops`);
  return map;
}

async function rewriteQuestImages(file: string, images: Record<string, string>): Promise<void> {
  let source = await fs.readFile(file, 'utf-8');

  // Quest objects are generated JSON: rewrite the poapImageLink of each
  // verifyPoap quest to the local snapshot of its drop (conditionValues).
  let rewritten = 0;
  let missing = 0;
  source = source.replace(
    /("conditionType": "verifyPoap",\n(?:.*\n)*?    "poapImageLink": ")(https:\/\/assets\.poap\.xyz\/[^"]+|\/images\/poaps\/[^"]+)(")/g,
    (match, prefix, _url, suffix) => {
      const dropId = prefix.match(/"conditionValues": "(\d+)"/)?.[1];
      if (!dropId || !images[dropId]) {
        missing++;
        return match;
      }
      rewritten++;
      return `${prefix}${images[dropId]}${suffix}`;
    }
  );

  await fs.writeFile(file, source);
  const label = path.relative(path.join(__dirname, '..', '..'), file);
  console.log(`✅ ${label}: ${rewritten} poapImageLink rewritten${missing ? `, ${missing} without local image` : ''}`);
}

async function main(): Promise<void> {
  await buildMints();
  await buildDropStats();
  const images = await buildImageMap();
  for (const file of QUESTS_FILES) {
    await rewriteQuestImages(file, images);
  }
}

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
