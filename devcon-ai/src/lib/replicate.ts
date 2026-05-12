// Minimal Replicate API client. Creates a prediction, polls until terminal,
// returns the first output image URL. Used by the devcon-avatar route as an
// alternative to OpenAI's image-edit when AVATAR_PROVIDER=replicate.

const REPLICATE_API = "https://api.replicate.com/v1";
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 120_000;

interface PredictionResponse {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: unknown;
  error?: string | null;
  logs?: string;
}

export interface ReplicateInput {
  // Either `model` (owner/name, server picks latest official version) or
  // `version` (explicit hashed version) — Replicate accepts either.
  model?: string;
  version?: string;
  input: Record<string, unknown>;
}

export async function runReplicate(args: ReplicateInput): Promise<string> {
  // Trim because some env-file parsers leave trailing whitespace / newlines,
  // which Replicate's stricter GET endpoints (used for polling) reject as
  // an "invalid auth token" while POST endpoints quietly accept.
  const token = process.env.REPLICATE_API_TOKEN?.trim();
  if (!token) throw new Error("REPLICATE_API_TOKEN not configured");

  if (!args.model && !args.version) {
    throw new Error("runReplicate: provide either model or version");
  }

  const body: Record<string, unknown> = { input: args.input };
  if (args.version) body.version = args.version;

  // Endpoint differs slightly: official models use /v1/models/{owner}/{name}/predictions,
  // versioned community models use /v1/predictions with `version` in body.
  const createUrl = args.version
    ? `${REPLICATE_API}/predictions`
    : `${REPLICATE_API}/models/${args.model}/predictions`;

  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      // Replicate honors Prefer: wait by holding the connection open until the
      // prediction is terminal (or 60s, whichever first). For fast models this
      // means create returns the finished prediction in one round-trip and we
      // never poll. Falls through to the poll loop if it's still running.
      Prefer: "wait=60",
    },
    body: JSON.stringify(body),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(
      `Replicate create failed (${createRes.status}): ${errText.slice(0, 300)}`,
    );
  }

  let prediction = (await createRes.json()) as PredictionResponse;
  const startedAt = Date.now();

  while (
    prediction.status !== "succeeded" &&
    prediction.status !== "failed" &&
    prediction.status !== "canceled"
  ) {
    if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
      throw new Error(
        `Replicate prediction ${prediction.id} timed out after ${POLL_TIMEOUT_MS / 1000}s (status: ${prediction.status})`,
      );
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const pollRes = await fetch(
      `${REPLICATE_API}/predictions/${prediction.id}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!pollRes.ok) {
      const errText = await pollRes.text();
      throw new Error(
        `Replicate poll failed (${pollRes.status}): ${errText.slice(0, 200)}`,
      );
    }
    prediction = (await pollRes.json()) as PredictionResponse;
  }

  if (prediction.status !== "succeeded") {
    throw new Error(
      `Replicate prediction ${prediction.id} ${prediction.status}: ${prediction.error || "unknown"}`,
    );
  }

  // Output shape varies per model. Common cases:
  //   - string (single URL)
  //   - string[] (array of URLs — take first)
  //   - { image: string } or similar object — extract first URL we find
  const out = prediction.output;
  if (typeof out === "string") return out;
  if (Array.isArray(out) && out.length > 0 && typeof out[0] === "string") {
    return out[0];
  }
  throw new Error(
    `Replicate prediction ${prediction.id} returned unexpected output: ${JSON.stringify(out).slice(0, 200)}`,
  );
}
