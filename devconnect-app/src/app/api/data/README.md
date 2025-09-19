# Data API

## Endpoint
`GET /api/data`

## Description
Fetches supporter and POI (Point of Interest) data from a Notion database. The data is automatically categorized based on the `POI` select field (previously was boolean `Is POI`).

## Response Format

```json
{
  "success": true,
  "data": {
    "supporters": {
      "268638cdc41580a1b02dc7a52c626d67": {
        "name": "Espresso",
        "layerName": "l2s_espresso",
        "districtId": "2",
        "locationId": "1",
        "supporterId": "24c638cdc415801d8452f81fa83560b8"
      }
    },
    "pois": [
      {
        "name": "Help desk 1",
        "layerName": "arts/help-desk-1",
        "districtId": "3",
        "locationId": "3",
        "groupId": "1"
      }
    ],
    "districts": {
      "1": { "name": "L2s" },
      "2": { "name": "Social" },
      "3": { "name": "Hardware & Wallets" }
    },
    "locations": {
      "1": { "name": "Pista Central" },
      "2": { "name": "Green Pavilion" },
      "3": { "name": "Pavilion 9" }
    },
    "poiGroups": {
      "1": { "name": "Help Desk" },
      "2": { "name": "Food & Drinks" },
      "3": { "name": "Entertainment" }
    }
  },
  "timestamp": "2025-09-09T17:59:05.480Z"
}
```

## Data Structure

### Supporters
Object of supporter objects where `POI` field is empty, with supporter ID as key:

- Key (string): Supporter ID (Notion page ID with hyphens removed)
- Value: Object containing:
  - `name` (string): Supporter name
  - `layerName` (string): Layer naming convention
  - `districtId` (string|null): Reference to districts object key
  - `locationId` (string|null): Reference to locations object key
  - `supporterId` (string): Related quest supporter ID (if any)

### POIs (Points of Interest)
Array of POI objects where `POI` field has a value. Each POI contains:

- `name` (string): POI name
- `layerName` (string): Layer naming convention
- `districtId` (string|null): Reference to districts object key
- `locationId` (string|null): Reference to locations object key
- `groupId` (string|null): Reference to poiGroups object key
- `logo` (string): Logo URL
- `description` (string): POI description

### Districts
Object of unique district objects with numeric string keys:

- Key (string): Sequential ID starting from "1"
- Value: Object with `name` (string): District name

### Locations

Object of unique location objects with numeric string keys:

- Key (string): Sequential ID starting from "1"
- Value: Object with `name` (string): Location name

### POI Groups

Object of unique POI group objects with numeric string keys:

- Key (string): Sequential ID starting from "1"
- Value: Object with `name` (string): POI group name

## Supported Property Types
- `title` - Page titles
- `rich_text` - Text content
- `select` - Dropdown selections
- `number` - Numeric values
- `url` - Web URLs
- `files` - File attachments
- `unique_id` - Unique identifiers
- `formula` - Calculated values (string, number, boolean, date)
- `checkbox` - Boolean values (returned as 'true'/'false' strings)
- `relation` - Related page references (returns first relation ID with hyphens removed)

## Error Response
```json
{
  "success": false,
  "error": "Failed to return data",
  "details": "Error message",
  "timestamp": "2025-09-09T17:59:05.480Z"
}
```
