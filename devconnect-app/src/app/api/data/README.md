# Data API

## Endpoint
`GET /api/data`

## Description
Fetches supporter and POI (Point of Interest) data from a Notion database. The data is automatically categorized based on the `Is POI` checkbox field.

## Response Format

```json
{
  "success": true,
  "data": {
    "supporters": [
      {
        "name": "Espresso",
        "layerNaming": "l2s/espresso",
        "districtId": 1,
        "locationId": 1
      }
    ],
    "pois": [
      {
        "name": "Help desk 1",
        "layerNaming": "arts/help-desk-1",
        "districtId": 3,
        "locationId": 3
      }
    ],
    "districts": [
      { "id": 1, "name": "L2s" },
      { "id": 2, "name": "Social" },
      { "id": 3, "name": "Hardware & Wallets" }
    ],
    "locations": [
      { "id": 1, "name": "Pista Central" },
      { "id": 2, "name": "Green Pavilion" },
      { "id": 3, "name": "Pavilion 9" }
    ]
  },
  "timestamp": "2025-09-09T17:59:05.480Z"
}
```

## Data Structure

### Supporters
Array of supporter objects where `Is POI` is `false`. Each supporter contains:
- `name` (string): Supporter name
- `layerNaming` (string): Layer naming convention
- `districtId` (number|null): Reference to districts array ID
- `locationId` (number|null): Reference to locations array ID

### POIs (Points of Interest)
Array of POI objects where `Is POI` is `true`. Each POI contains the same fields as supporters.

### Districts
Array of unique district objects with:
- `id` (number): Sequential ID starting from 1
- `name` (string): District name

### Locations
Array of unique location objects with:
- `id` (number): Sequential ID starting from 1
- `name` (string): Location name

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
