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
    "supporters": [
      {
        "name": "Espresso",
        "layerName": "l2s/espresso",
        "districtId": "1",
        "locationId": "1"
      }
    ],
    "pois": [
      {
        "name": "Help desk 1",
        "layerName": "arts/help-desk-1",
        "districtId": "3",
        "locationId": "3"
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
    }
  },
  "timestamp": "2025-09-09T17:59:05.480Z"
}
```

## Data Structure

### Supporters
Array of supporter objects where `POI` field is empty. Each supporter contains:
- `name` (string): Supporter name
- `layerName` (string): Layer naming convention
- `districtId` (string|null): Reference to districts object key
- `locationId` (string|null): Reference to locations object key

### POIs (Points of Interest)
Array of POI objects where `POI` field has a value. Each POI contains the same fields as supporters.

### Districts
Object of unique district objects with numeric string keys:

- Key (string): Sequential ID starting from "1"
- Value: Object with `name` (string): District name

### Locations

Object of unique location objects with numeric string keys:

- Key (string): Sequential ID starting from "1"
- Value: Object with `name` (string): Location name

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

## Error Response
```json
{
  "success": false,
  "error": "Failed to return data",
  "details": "Error message",
  "timestamp": "2025-09-09T17:59:05.480Z"
}
```
