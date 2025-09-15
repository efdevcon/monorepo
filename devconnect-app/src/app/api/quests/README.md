# Quests API

## Endpoint
`GET /api/quests`

## Description
Fetches quest data from a Notion database. Quests are ordered by the 'Order' property in ascending order.

## Response Format

```json
{
  "success": true,
  "quests": [
    {
      "id": 1,
      "name": "Connect your event ticket",
      "order": 1,
      "points": 20,
      "difficulty": "1. Beginner",
      "instructions": "",
      "action": "connect-wallet",
      "button": "Connect Wallet",
      "group": "Onboarding",
      "conditionType": "isWalletConnected",
      "conditionValues": "",
      "supporterId": "",
      "poapImageLink": ""
    }
  ],
  "total": 1,
  "timestamp": "2025-01-09T17:59:05.480Z"
}
```

## Data Structure

### Quest Object
Each quest contains the following fields:

- `id` (number): Quest identifier
- `name` (string): Quest name/title
- `order` (number): Display order (sorted ascending)
- `points` (number): Points awarded for completing the quest
- `difficulty` (string): Quest difficulty level (may include numbered prefixes)
- `instructions` (string): Instructions for completing the quest
- `action` (string): Type of action required
- `button` (string): Button text for the quest
- `group` (string): Quest group classification
- `conditionType` (string): Type of condition to check
- `conditionValues` (string): Values for the condition
- `supporterId` (string): ID of the related supporter (if any)
- `poapImageLink` (string): URL to POAP image

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
