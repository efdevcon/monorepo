# Scripts

Utility scripts for data fetching and wallet management.

## Scripts Overview

### `fetch-data.ts`

Fetches supporter and POI data from the `/api/data` endpoint and processes it into structured TypeScript files.

**Features:**

- Downloads and processes data from Notion database
- Detects Notion temporary image URLs (containing `X-Amz-Security-Token`)
- Can automatically process temporary images: download → upload to Supabase → update Notion

### `fetch-quests.ts`

Fetches quest data from the `/api/quests` endpoint and processes it with group/district mapping.

### `create-smart-wallet.ts`

Creates a CDP v2 Smart Account for gasless USDC transfers. See [COINBASE_SETUP.md](../COINBASE_SETUP.md) for details.

## Usage

### Data Script

Fetch data and automatically process Notion temporary image URLs:

```bash
pnpm run d
# or
pnpm run fetch-data
```

This will:

- Fetch all supporter and POI data
- **Automatically detect and process ALL Notion temporary image URLs**:
  - Downloads images from Notion
  - Uploads them to Supabase storage
  - Updates Notion with permanent URLs
  - Re-fetches and saves updated data
- Save the data to TypeScript files

**Automatic Image Processing:**

- If `NOTION_SECRET` is configured in `.env.local`, the script will automatically process all Notion temporary images
- If not configured, the script will skip image processing and just save the data
- All operations are logged with detailed progress information
- Images are processed sequentially to avoid rate limiting

### Quests Script

#### Using pnpm script (recommended)

```bash
pnpm run fetch-quests
```

#### Using tsx directly

```bash
pnpm exec tsx scripts/fetch-quests.ts
```

### Wallet Script

#### Using pnpm script (recommended)

```bash
pnpm create-wallet
```

Creates a CDP v2 Smart Account. Requires CDP credentials in `.env.local`.

## What the scripts do

### Data Script (`fetch-data.ts`)

1. **Fetches data** from the `/api/data` endpoint
2. **Processes and saves TypeScript files**:
   - `supporters.ts` - Object of supporter data (keyed by ID) with proper TypeScript types
   - `pois.ts` - Array of POI (Point of Interest) data with proper TypeScript types
   - `districts.ts` - Object mapping district IDs to names and layerNames with proper TypeScript types
   - `locations.ts` - Object mapping location IDs to names and layerNames with proper TypeScript types
   - `poiGroups.ts` - Object mapping POI group IDs to names with proper TypeScript types
   - `api-data.json` - Full API response (commented out by default)

**Data Processing:**

- Filters out entries with empty names
- Separates supporters (empty POI field) from POIs (has POI value)
- Creates unique districts, locations, and POI groups with numeric IDs
- Maps district/location names to numeric IDs in supporters and POIs
- Generates `layerName` fields by converting names to lowercase and replacing spaces with hyphens
- Sorts supporters and POIs alphabetically by name
- **Automatically processes Notion temporary image URLs** (URLs containing `X-Amz-Security-Token`)

**Automatic Image Processing:**

When Notion temporary image URLs are detected, the script automatically:

1. Downloads the image from the Notion-hosted URL
2. Converts to base64 for upload
3. Uploads to Supabase storage via `/api/upload` endpoint (<https://devconnect.org>)
4. Retrieves the Notion page password from the database
5. Updates the Notion page with the new permanent URL via `/api/notion/[id]` endpoint
6. Re-fetches the data to get the updated URL
7. Saves the updated data to TypeScript files

**Requirements for Automatic Image Processing:**

- `NOTION_SECRET` environment variable must be set in `.env.local`
- The Notion database field must be marked as `[edit]` to allow updates
- The Notion page must have a "Form password" field
- Internet connection to <https://devconnect.org> for upload and update operations

### Quests Script (`fetch-quests.ts`)

1. **Fetches data** from the `/api/quests` endpoint
2. **Processes and saves TypeScript files**:
   - `quests.ts` - Array of quest data with proper TypeScript types
   - `api-quests.json` - Full API response (commented out by default)

**Data Processing:**

- Maps group names to group IDs using `questGroupsData`
- Removes numbered prefixes from group names (e.g., "1. Onboarding" → "Onboarding")
- Adds `districtId` fields based on `supporterId` lookup using `supportersData`
- Sorts quests by ID for consistent ordering
- Calculates statistics (quests with groups, districts, total points)

## Configuration

The scripts use the following environment variables:

- `API_BASE_URL` - Base URL for the API (defaults to `http://localhost:3000`)

## Output

The scripts will output:

- ✅ Success messages with data counts and statistics
- ❌ Error messages if something goes wrong
- 📁 All TypeScript data files saved to `src/data/` directory

## TypeScript Types

Type definitions for the API responses are available in `src/types/`:

- `src/types/api-data.ts` - Data API types (Supporter, POI, District, Location, PoiGroup, etc.)
- `src/types/quest.ts` - Quest API types (Quest, QuestAction, QuestConditionType, etc.)

The generated TypeScript files include proper imports and type annotations, making them ready to use in your application with full type safety.

## Dependencies

The scripts import and use the following data files for processing:

- `src/data/supporters` - For district mapping in quests
- `src/data/districts` - For district information
- `src/data/questGroups` - For group name to ID mapping in quests
