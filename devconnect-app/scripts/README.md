# Data Fetch Scripts

These scripts fetch data from various API endpoints and save them to the `src/data/` directory.

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
2. **Saves individual files**:
   - `supporters.json` - Object of supporter data (keyed by ID)
   - `pois.json` - Array of POI (Point of Interest) data  
   - `districts.json` - Object mapping district IDs to names
   - `locations.json` - Object mapping location IDs to names
   - `api-data.json` - Complete API response

### Quests Script
1. **Fetches data** from the `/api/quests` endpoint
2. **Saves files**:
   - `quests.json` - Array of quest data
   - `api-quests.json` - Complete API response

## Configuration

The scripts use the following environment variables:
- `API_BASE_URL` - Base URL for the API (defaults to `http://localhost:3000`)

## Output

The scripts will output:
- ✅ Success messages with data counts
- ❌ Error messages if something goes wrong
- 📁 All data files saved to `src/data/` directory

## TypeScript Types

Type definitions for the API responses are available in `src/types/`:
- `src/types/api-data.ts` - Data API types (Supporter, POI, District, Location, etc.)
- `src/types/quest.ts` - Quest API types (Quest, QuestAction, QuestConditionType, etc.)
