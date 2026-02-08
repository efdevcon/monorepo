import { Router } from "express";
import { z } from "zod";
import { createServerClient } from "../lib/supabase.js";

export const fuzzyRouter: Router = Router();

const searchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(50).optional().default(10),
  sourceType: z.string().optional(),
  sourceRepo: z.string().optional(),
});

// Serve HTML form UI
fuzzyRouter.get("/", (_req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fuzzy Text Search</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 { color: #333; }
    form {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; font-weight: 500; }
    input[type="text"], input[type="number"], select {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
    }
    button {
      background: #6366f1;
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
    }
    button:hover { background: #4f46e5; }
    button:disabled { background: #9ca3af; cursor: not-allowed; }
    #results {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .result-item {
      border-bottom: 1px solid #eee;
      padding: 15px 0;
    }
    .result-item:last-child { border-bottom: none; }
    .result-meta {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
    }
    .result-content {
      font-size: 14px;
      white-space: pre-wrap;
      background: #f9f9f9;
      padding: 10px;
      border-radius: 4px;
      max-height: 200px;
      overflow-y: auto;
    }
    .highlight { background: yellow; }
    .stats { color: #666; margin-bottom: 15px; }
    .error { color: #dc2626; }
    .form-row { display: flex; gap: 15px; }
    .form-row .form-group { flex: 1; }
  </style>
</head>
<body>
  <h1>Fuzzy Text Search</h1>

  <form id="searchForm">
    <div class="form-group">
      <label for="query">Search Query</label>
      <input type="text" id="query" name="query" placeholder="Enter search terms..." required>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="limit">Max Results</label>
        <input type="number" id="limit" name="limit" value="10" min="1" max="50">
      </div>

      <div class="form-group">
        <label for="sourceType">Source Type</label>
        <input type="text" id="sourceType" name="sourceType" placeholder="e.g., devcon-api">
      </div>

      <div class="form-group">
        <label for="sourceRepo">Source Repo</label>
        <input type="text" id="sourceRepo" name="sourceRepo" placeholder="e.g., devcon-7">
      </div>
    </div>

    <button type="submit">Search</button>
  </form>

  <div id="results"></div>

  <script>
    const form = document.getElementById('searchForm');
    const resultsDiv = document.getElementById('results');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const query = document.getElementById('query').value;
      const limit = parseInt(document.getElementById('limit').value) || 10;
      const sourceType = document.getElementById('sourceType').value || undefined;
      const sourceRepo = document.getElementById('sourceRepo').value || undefined;

      const button = form.querySelector('button');
      button.disabled = true;
      button.textContent = 'Searching...';
      resultsDiv.innerHTML = '<p>Loading...</p>';

      try {
        const body = { query, limit };
        if (sourceType) body.sourceType = sourceType;
        if (sourceRepo) body.sourceRepo = sourceRepo;

        const response = await fetch('/api/fuzzy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Search failed');
        }

        if (data.results.length === 0) {
          resultsDiv.innerHTML = '<p>No results found.</p>';
          return;
        }

        const highlightQuery = (text, query) => {
          const terms = query.split(/\\s+/).filter(t => t.length > 2);
          let highlighted = text;
          terms.forEach(term => {
            const escaped = term.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
            const regex = new RegExp('(' + escaped + ')', 'gi');
            highlighted = highlighted.replace(regex, '<span class="highlight">$1</span>');
          });
          return highlighted;
        };

        resultsDiv.innerHTML = \`
          <p class="stats">Found \${data.count} results for "\${data.query}" in \${data.searchTime}ms</p>
          \${data.results.map((r, i) => \`
            <div class="result-item">
              <div class="result-meta">
                <strong>#\${i + 1}</strong> |
                \${r.source_type}/\${r.source_repo || 'unknown'} |
                \${r.source_id} |
                Title: \${r.metadata?.title || 'N/A'}
              </div>
              <div class="result-content">\${highlightQuery(r.content, query)}</div>
            </div>
          \`).join('')}
        \`;
      } catch (error) {
        resultsDiv.innerHTML = '<p class="error">Error: ' + error.message + '</p>';
      } finally {
        button.disabled = false;
        button.textContent = 'Search';
      }
    });
  </script>
</body>
</html>
  `);
});

// Fuzzy text search endpoint
fuzzyRouter.post("/", async (req, res) => {
  const startTime = Date.now();

  try {
    const { query, limit, sourceType, sourceRepo } = searchSchema.parse(req.body);

    const supabase = createServerClient();

    // Build fuzzy search query using ILIKE with wildcards
    // Split query into terms and search for any term match
    const terms = query.split(/\s+/).filter((t) => t.length > 0);
    const patterns = terms.map((term) => `%${term}%`);

    let queryBuilder = supabase
      .from("documents")
      .select("id, content, source_type, source_repo, source_id, metadata");

    // Add ILIKE conditions for each term (OR matching)
    if (patterns.length > 0) {
      const orConditions = patterns.map((p) => `content.ilike.${p}`).join(",");
      queryBuilder = queryBuilder.or(orConditions);
    }

    // Apply filters
    if (sourceType) {
      queryBuilder = queryBuilder.eq("source_type", sourceType);
    }
    if (sourceRepo) {
      queryBuilder = queryBuilder.eq("source_repo", sourceRepo);
    }

    const { data, error } = await queryBuilder.limit(limit);

    if (error) {
      console.error("Fuzzy search error:", error);
      res.status(500).json({ error: "Search failed", details: error.message });
      return;
    }

    const searchTime = Date.now() - startTime;

    res.json({
      results: data || [],
      query,
      count: data?.length || 0,
      searchTime,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request", details: error.errors });
      return;
    }

    console.error("Fuzzy search error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
