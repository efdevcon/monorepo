# Devcon AI

RAG-powered AI assistant API for Devcon and Ethereum Foundation events.

## Overview

Devcon AI provides a conversational interface that answers questions about Devcon, Devconnect, and the Ethereum ecosystem by searching a knowledge base of synced content.

### Key Features

- **Hybrid Search**: Combines fuzzy text search (pg_trgm) with vector embeddings
- **Agentic RAG**: AI can call search tools to refine queries and correct typos
- **Streaming Responses**: Server-sent events (SSE) for real-time streaming
- **Multi-source Support**: Sync content from multiple repositories

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  Express    │────▶│  OpenAI     │
│  (Event App)│◀────│  API        │◀────│  GPT-4o     │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │  Supabase   │
                    │  pgvector   │
                    │  pg_trgm    │
                    └─────────────┘
```

## Search Strategy

The search system uses a hybrid approach to maximize recall:

### 1. Fuzzy Search (pg_trgm)

Handles typos, compound words, and partial matches using PostgreSQL trigram similarity.

```
"table cloth" → finds "tablecloth"
"devcon tix"  → finds "devcon tickets"
```

**How it works:**
- Extract keywords from query (filter stop words)
- Take top 5 keywords by length (longer = more specific)
- Generate concatenated pairs for compound words (e.g., "table" + "cloth" → "tablecloth")
- Run up to 8 parallel searches using `word_similarity()`
- Merge results by highest similarity score

### 2. Vector Search (pgvector)

Semantic similarity using OpenAI embeddings for conceptual matching.

```
"when is the conference" → finds Devcon date/schedule info
"how to get there"       → finds venue/transportation info
```

**How it works:**
- Generate embedding using `text-embedding-3-small` (1536 dimensions)
- Cosine similarity search against document embeddings
- Returns documents above similarity threshold

### 3. Result Merging

Results from both searches are merged:
1. Fuzzy results first (keyword matches are usually more precise)
2. Vector results added (deduped by document ID)
3. Top N returned to the AI

## Agentic RAG

The AI has access to a `search_knowledge_base` tool and is instructed to use it when:

- Initial results don't answer the question
- User query might have typos (search with corrections)
- More specific information is needed

**Example flow:**
```
User: "what color is the tabelcloth?"
     ↓
Initial search: no relevant results (typo not matched)
     ↓
AI recognizes typo, calls: search_knowledge_base("tablecloth color")
     ↓
Tool returns: chunk containing "the tablecloth is green"
     ↓
AI responds: "The tablecloth is green."
```

The AI can make up to 3 tool calls per request before responding.

## Quick Start

### 1. Supabase Setup

Create a Supabase project and run migrations:

```bash
# From devcon-api folder
pnpx supabase db push
```

Required extensions and tables:
- `pgvector` - Vector similarity search
- `pg_trgm` - Trigram fuzzy matching
- `documents` table with embeddings
- `match_documents()` and `fuzzy_search()` functions

### 2. Environment Variables

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# OpenAI
OPENAI_API_KEY=sk-...
```

### 3. Run Locally

```bash
pnpm install
pnpm dev        # Starts server on port 3001
```

### 4. Sync Content

```bash
# Sync devcon content
pnpm sync:devcon

# Manual sync
npx tsx scripts/sync-documents.ts \
  --source-type github \
  --source-repo devcon \
  --path ../devcon/cms

# Force re-sync (bypass hash cache)
npx tsx scripts/sync-documents.ts \
  --source-repo devcon \
  --path ../devcon/cms \
  --force
```

## API Reference

### POST /api/chat

Streaming chat with RAG context and tool calls.

**Request:**
```json
{
  "message": "When is Devcon?",
  "history": [
    { "role": "user", "content": "previous question" },
    { "role": "assistant", "content": "previous answer" }
  ],
  "sourceRepo": "devcon"
}
```

**Response (SSE stream):**
```
data: {"type":"sources","documents":[...]}
data: {"type":"tool_call","tool":"search","query":"tablecloth","reason":"correcting typo"}
data: {"type":"sources","documents":[...]}
data: {"type":"text","text":"The"}
data: {"type":"text","text":" tablecloth"}
data: {"type":"text","text":" is green."}
data: {"type":"done"}
```

**Event types:**
| Type | Description |
|------|-------------|
| `sources` | Documents retrieved from search |
| `tool_call` | AI is calling search tool (query + reason) |
| `text` | Streamed response text chunk |
| `done` | Response complete |

### GET /health

Health check endpoint.

## Content Sync

The sync script processes markdown files:

1. Finds all `.md` and `.mdx` files
2. Extracts YAML frontmatter + body content
3. Chunks into ~1500 char segments with 200 char overlap
4. Generates embeddings via OpenAI
5. Upserts to Supabase (hash-based change detection)
6. **Deletes orphaned chunks** (files removed or chunks reduced)

### Cleanup Behavior

The sync automatically cleans up:
- Deleted files → chunks removed
- Edited files with fewer chunks → extra chunks removed
- Renamed files → old chunks deleted, new ones created

To manually delete all documents for a repo:
```sql
DELETE FROM documents WHERE source_repo = 'repo-name';
```

### GitHub Action

The `rag-sync.yml` workflow auto-syncs on push:

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'devcon/cms/**'
      - 'devconnect/cms/**'
```

Required secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `OPENAI_API_KEY`

## Database Schema

### documents table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| content | text | Chunk content |
| embedding | vector(1536) | OpenAI embedding |
| source_type | text | e.g., "github" |
| source_repo | text | e.g., "devcon" |
| source_id | text | File path + chunk index |
| source_hash | text | Content hash for change detection |
| metadata | jsonb | Title, file path, chunk info |

### Key Functions

| Function | Description |
|----------|-------------|
| `match_documents()` | Vector cosine similarity search |
| `fuzzy_search()` | Trigram word similarity search |

## Client Integration

Example React component for chat:

```tsx
const [messages, setMessages] = useState<Message[]>([]);
const [isLoading, setIsLoading] = useState(false);

const sendMessage = async (text: string) => {
  setIsLoading(true);
  const history = messages.map(m => ({ role: m.role, content: m.content }));

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text, history }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let assistantText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

    for (const line of lines) {
      const data = JSON.parse(line.slice(6));
      if (data.type === 'text') {
        assistantText += data.text;
        // Update UI with streaming text
      }
    }
  }

  setMessages([...messages,
    { role: 'user', content: text },
    { role: 'assistant', content: assistantText }
  ]);
  setIsLoading(false);
};
```

## Customization

### System Prompt

Edit `src/routes/chat.ts`:

```typescript
const SYSTEM_PROMPT = `You are [Your Bot], assistant for [Your Event]...`;
```

### Models

| Component | Default | Config Location |
|-----------|---------|-----------------|
| Embeddings | `text-embedding-3-small` | `src/lib/embeddings.ts` |
| Chat | `gpt-4o` | `src/routes/chat.ts` |

### Search Tuning

In `src/lib/rag.ts`:
- `matchCount` - Number of results per search (default: 10)
- `matchThreshold` - Vector similarity threshold (default: 0.2)
- `similarity_threshold` - Fuzzy search threshold (default: 0.15)

## Cost Considerations

| Operation | Cost |
|-----------|------|
| Embedding (text-embedding-3-small) | ~$0.02 / 1M tokens |
| Initial sync (~200 chunks) | < $0.01 |
| Chat (GPT-4o) | ~$5 / 1M input, ~$15 / 1M output |
| Average request | ~2-4K tokens |
| Tool calls | +1-2K tokens each |

Search operations (fuzzy + vector) are free PostgreSQL queries.

## Deployment

### Render

1. Connect repo
2. Set root directory: `devcon-ai`
3. Build command: `npm run build`
4. Start command: `npm start`
5. Add environment variables

### Other Platforms

Any Node.js host works. Ensure:
- Node 18+
- Environment variables set
- Supabase accessible from host
