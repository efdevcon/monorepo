# Data Fetch Scripts

These scripts fetch data from various API endpoints and save them as TypeScript files in the `src/data/` directory.

## Data Script

Fetches supporter and POI data from the `/api/data` endpoint.

### Usage

#### Using pnpm script (recommended)
```bash
pnpm run fetch-data
```

#### Using tsx directly
```bash
pnpm exec tsx scripts/fetch-data.ts
```

## Quests Script

Fetches quest data from the `/api/quests` endpoint.

### Usage

#### Using pnpm script (recommended)
```bash
pnpm run fetch-quests
```

#### Using tsx directly
```bash
pnpm exec tsx scripts/fetch-quests.ts
```

## What the scripts do

### Data Script
1. **Fetches data** from the `/api/data` endpoint
2. **Saves individual TypeScript files**:
   - `supporters.ts` - Object of supporter data (keyed by ID) with proper TypeScript types
   - `pois.ts` - Array of POI (Point of Interest) data with proper TypeScript types
   - `districts.ts` - Object mapping district IDs to names and layerNames with proper TypeScript types
   - `locations.ts` - Object mapping location IDs to names and layerNames with proper TypeScript types
   - `poiGroups.ts` - Object mapping POI group IDs to names with proper TypeScript types

### Quests Script
1. **Fetches data** from the `/api/quests` endpoint
2. **Saves files**:
   - `quests.ts` - Array of quest data with proper TypeScript types

## Configuration

The scripts use the following environment variables:
- `API_BASE_URL` - Base URL for the API (defaults to `http://localhost:3000`)

## Output

The scripts will output:
- ✅ Success messages with data counts
- ❌ Error messages if something goes wrong
- 📁 All TypeScript data files saved to `src/data/` directory

## TypeScript Types

Type definitions for the API responses are available in `src/types/`:

- `src/types/api-data.ts` - Data API types (Supporter, POI, District, Location, PoiGroup, etc.)
- `src/types/quest.ts` - Quest API types (Quest, QuestAction, QuestConditionType, etc.)

The generated TypeScript files include proper imports and type annotations, making them ready to use in your application with full type safety.

## Data Processing

The scripts automatically process the data before saving:

- **Districts and Locations**: Generate `layerName` fields by converting names to lowercase and replacing spaces with hyphens (e.g., "Hardware & Wallets" → "hardware-wallets")
- **POI Groups**: Create unique POI group objects with numeric IDs, replacing group names with `groupId` references in POI objects
- **Quests**: Transform group names by removing numbered prefixes (e.g., "1. Onboarding" → "Onboarding") and add `districtId` fields based on `supporterId` lookup
