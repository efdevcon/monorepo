# Quests API

## Endpoint
`GET /api/quests`

## Description
Fetches quest data from a Notion database with automatic POAP image fetching. Quests are ordered by the 'Order' property in ascending order. The API automatically fetches POAP images from the POAP GraphQL API for quests with `conditionType: "verifyPoap"`.

## Features

- **POAP Image Fetching**: Automatically fetches POAP images from `https://public.compass.poap.tech/v1/graphql`
- **Batch Processing**: Fetches all POAP images in a single GraphQL request for efficiency
- **POAP ID Extraction**: Extracts POAP IDs from `conditionValues` when `conditionType` is "verifyPoap"
- **Image URL Population**: Updates `poapImageLink` with fetched POAP images
- **Fallback Support**: Uses existing `poapImageLink` from Notion if POAP API fails

## Response Format

```json
{
  "success": true,
  "quests": [
    {
      "id": 1,
      "name": "Connect your event ticket",
      "order": 1,
      "instructions": "Connect your wallet to get started",
      "action": "connect-wallet",
      "button": "Connect Wallet",
      "group": "Onboarding",
      "conditionType": "isWalletConnected",
      "conditionValues": "",
      "supporterId": "",
      "poapImageLink": "https://assets.poap.xyz/example-image.png"
    },
    {
      "id": 2,
      "name": "Claim POAP",
      "order": 2,
      "instructions": "Verify you have the POAP",
      "action": "claim-poap",
      "button": "Verify",
      "group": "POAPs",
      "conditionType": "verifyPoap",
      "conditionValues": "190840",
      "supporterId": "241638cdc415809d9909ea3bbcb6d327",
      "poapImageLink": "https://assets.poap.xyz/poap-image-190840.png"
    }
  ],
  "total": 2,
  "timestamp": "2025-01-09T17:59:05.480Z"
}
```

## Data Structure

### Quest Object

Each quest contains the following fields:

- `id` (number): Quest identifier
- `name` (string): Quest name/title
- `order` (number): Display order (sorted ascending)
- `instructions` (string): Instructions for completing the quest
- `action` (string): Type of action required
- `button` (string): Button text for the quest
- `group` (string): Quest group classification
- `conditionType` (string): Type of condition to check
- `conditionValues` (string): Values for the condition (POAP ID when conditionType is "verifyPoap")
- `supporterId` (string): ID of the related supporter (if any)
- `poapImageLink` (string): URL to POAP image (fetched from POAP API or from Notion)

## POAP Integration

### How it works

1. **POAP ID Detection**: Quests with `conditionType: "verifyPoap"` have their POAP ID extracted from `conditionValues`
2. **Batch Fetching**: All POAP IDs are collected and fetched in a single GraphQL request
3. **Image Mapping**: POAP images are mapped by ID and used to update `poapImageLink`
4. **Fallback**: If POAP API fails, existing `poapImageLink` from Notion is preserved

### GraphQL Query

```graphql
query GetPOAPImages($ids: [Int!]!) {
  drops(where: {id: {_in: $ids}}) {
    id
    image_url
  }
}
```

## Supported Property Types
- `title` - Page titles
- `rich_text` - Text content
- `select` - Dropdown selections
- `number` - Numeric values
- `url` - Web URLs
- `files` - File attachments
- `unique_id` - Unique identifiers
- `relation` - Related page references (returns first relation ID with hyphens removed)

## Error Response
```json
{
  "success": false,
  "error": "Failed to return quest data",
  "details": "Error message",
  "timestamp": "2025-01-09T17:59:05.480Z"
}
```

## Database Configuration
- **Database ID**: `24c638cdc41580e5bc31f643e4eaeff3`
- **Sorting**: By 'Order' property in ascending order
- **Required Environment Variable**: `NOTION_SECRET`
- **POAP API**: `https://public.compass.poap.tech/v1/graphql`
