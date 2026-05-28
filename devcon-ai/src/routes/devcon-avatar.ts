import { Router } from "express";
import express from "express";
import { z } from "zod";
import OpenAI, { toFile } from "openai";
import { createServerClient } from "../lib/supabase.js";
import { validateBearerToken } from "../lib/auth.js";
import { emailHasPaidTicket } from "../lib/pretix.js";
import fs from "fs";
import path from "path";
import { createHash } from "crypto";

// Pinned to real OpenAI; see lib/embeddings.ts for rationale.
// maxRetries bumped from default 2 to 5 — `images.edit` occasionally gets a
// remote socket close ("socket hang up") even at low quality. The SDK
// retries with exponential backoff on transport-level errors.
// Explicit 10-min timeout matches the default but documents intent.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.openai.com/v1",
  maxRetries: 5,
  timeout: 10 * 60 * 1000,
});

// Reverted to "low" — "high" deterministically blows OpenAI's 60s
// server-side budget on /v1/images/edits regardless of SDK transport. To
// raise this above "low" or "medium" we'd need to move the call to the
// Responses API with background: true and add a polling endpoint.
const IMAGE_QUALITY = "low" as const;

const CHARACTERS_DIR = path.join(process.cwd(), "image-references/characters");

const DEVCON_AVATAR_BUCKET = "devcon-avatars";

function loadImage(filePath: string): { base64: string; mimeType: string } {
  const buffer = fs.readFileSync(filePath);
  return { base64: buffer.toString("base64"), mimeType: "image/png" };
}

// Load all character reference images at module init — they don't change at runtime.
const STYLE_REFERENCES: { base64: string; mimeType: string; name: string }[] =
  (() => {
    try {
      const files = fs
        .readdirSync(CHARACTERS_DIR)
        .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
        .sort();
      if (files.length === 0) {
        console.warn(
          `[devcon-avatar] No character reference images found in ${CHARACTERS_DIR}`,
        );
      }
      return files.map((f) => ({
        ...loadImage(path.join(CHARACTERS_DIR, f)),
        name: f,
      }));
    } catch (err: any) {
      console.error(
        `[devcon-avatar] Failed to load character references from ${CHARACTERS_DIR}:`,
        err.message,
      );
      return [];
    }
  })();
console.log(
  `[devcon-avatar] Loaded ${STYLE_REFERENCES.length} character reference image(s): ${STYLE_REFERENCES.map((r) => r.name).join(", ")}`,
);

function detectMimeFromBase64(b64: string): string {
  if (b64.startsWith("iVBORw0KGgo")) return "image/png";
  if (b64.startsWith("/9j/")) return "image/jpeg";
  if (b64.startsWith("UklGR")) return "image/webp";
  return "image/png";
}

function hashEmail(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

// Emails (and domains) that skip the Pretix ticket check. Used while ticket
// infrastructure isn't fully live yet, and for ad-hoc testing. Comma-separated
// env var. Entries beginning with "@" are treated as domain matches (e.g.
// "@ethereum.org" allows any address on that domain); everything else is an
// exact email match. These users still must complete the OTP flow — only the
// Pretix lookup is skipped for them.
const WHITELIST_ENTRIES: readonly string[] = (
  process.env.AVATAR_TICKET_WHITELIST || "@ethereum.org"
)
  .split(",")
  .map((s) => s.toLowerCase().trim())
  .filter(Boolean);

const WHITELIST_EMAILS = new Set(
  WHITELIST_ENTRIES.filter((e) => !e.startsWith("@")),
);
const WHITELIST_DOMAINS = WHITELIST_ENTRIES.filter((e) => e.startsWith("@"));

function isWhitelisted(email: string): boolean {
  const normalized = email.toLowerCase().trim();
  if (WHITELIST_EMAILS.has(normalized)) return true;
  return WHITELIST_DOMAINS.some((domain) => normalized.endsWith(domain));
}

const generateSchema = z.object({
  image: z.string().min(100),
  // `crop` is one of the four Devcon values — drives the color theme.
  // `character` is accepted for backwards compat with any old clients.
  crop: z.string().optional(),
  character: z.string().optional(),
  // Legacy mode param — kept for backwards compat, no longer used.
  mode: z.enum(["style", "character", "accessories"]).default("style").optional(),
});

function characterBaseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

function findCharacter(
  name: string,
): { base64: string; mimeType: string; name: string } | null {
  const target = name.toLowerCase().trim();
  return (
    STYLE_REFERENCES.find(
      (r) => characterBaseName(r.name).toLowerCase() === target,
    ) ?? null
  );
}

// Canonical Devcon avatar prompt — Infinite Garden / Indian lunarpunk
// painterly-anime style, vetted in the avatar-lab. For now, every generation
// uses this single prompt regardless of mode/character; per-crop variations
// will be layered on once the basic flow is validated against this prompt.
const INFINITE_GARDEN_PROMPT = `Create a contemplative character portrait inspired by Ethereum's Infinite Garden — a quiet spiritual study fused with the luminous Devcon 8 Mumbai mascot aesthetic. The presentation should feel curated, considered, and restrained: closer to a sacred manuscript plate than a magazine spread.

RENDERING STYLE:
Painterly anime cinematic illustration. Soft brush textures, subtle grain, atmospheric lighting, volumetric glow. Soft edges, cinematic depth. Indian lunarpunk aesthetic — luminous, nocturnal, tech-nature symbiosis. NOT hyper-sharp. NOT photorealistic. NOT 3D-rendered. Visible brushwork is welcome.

Feature the subject from the source photo in a calm, grounded pose with strong silhouette clarity and a sense of unhurried presence. Keep the subject as the central focus, framed with the careful visual hierarchy of a devotional plate.

LIKENESS:
Preserve the subject's recognizable likeness, features, expression, age, hair shape, and skin tone — but reinterpreted as a painted anime character, not a photograph. They should be unmistakably the same person, illustrated. Don't change their identity; do paint them.

Do not create a symmetrical half-and-half split. Instead, let a slow, controlled bloom of luminous matter grow outward from selected areas of the outfit, accessories, or aura — as if the spirit of the garden is gently overflowing into the subject. The transformation should feel intentional and sacred, like a still moment caught mid-growth in a luminous grove.

The bloom flows organically rather than dividing the subject evenly. Let it emerge from clothing, accessories, or the air around them — never replacing the face — while preserving the recognizable silhouette and identity.

The luminous material should feel like:
- iridescent painted lacquer in deep indigo, violet, and teal
- bioluminescent sap tinted with starlight
- glowing cyan vines and tendrils of slow-flowing light
- magenta sparks and warm-gold filament highlights
- suspended petals, dewdrops, and ribbons of frozen painted light

ETHEREUM RESONANCE (subtle, latent):
Within the painted flora and luminous matter, hide one or two whispered echoes of Ethereum's diamond silhouette — two stacked pyramids forming an upright octahedron. A petal's facets might align into that shape; a dewdrop's inner reflection might cut into it; a glowing seed-pod or bud might echo the geometry. Treat it as form latent in nature, never as a logo. The diamond must read as part of the flora — petal, fruit, gem-like dew — not as branding or jewelry. If a viewer recognizes it as "the Ethereum icon" at a glance, you have gone too far. Subtle enough that it is noticed only on a second look.

Avoid:
- slime aesthetics
- horror melting
- chaotic dripping
- aggressive sci-fi effects
- photorealistic skin, hyper-sharp focus, or 3D/CGI rendering
- redrawn or altered identity
- explicit Ethereum logos, brand glyphs, or recognizable crypto iconography
- diamond shapes that read as cut jewelry, crystals, or repeated tessellation

The flowing forms should appear soft-edged, painted, glowing, and controlled — like vines, dewdrops, and ribbons suspended in a nocturnal sacred grove. Movement is slow and considered, never frantic. Light is volumetric and atmospheric.

Background: a luminous Indian lunarpunk Infinite Garden at twilight — deep indigo and violet skies, scattered stars, soft teal/cyan particle glow, occasional magenta sparks, warm-gold lantern highlights, and the faint suggestion of growing forms and bioluminescent flora in the distance. Generous negative space. Avoid pure white. Avoid pure black. Centered, square composition. Cinematic depth.

Optional restrained inserts: small atmospheric close-ups of painted glowing textures, organic surfaces, fragments of bloom, or quiet still-life details — painterly and contemplative, never technical, never analytical. These insets must also contain no text.

NO TEXT:
The final image must contain absolutely no text, words, letters, numbers, captions, labels, titles, headings, signatures, watermarks, logos, glyphs, or typography of any kind. No language, no calligraphy, no script, no symbols pretending to be text. The composition must be purely pictorial.

Avoid:
- any text, captions, labels, titles, or written language
- cluttered diagrams
- excessive callouts
- technical breakdown panels
- material analysis layouts
- floating exploded clothing parts
- combat imagery
- heavy sci-fi interfaces
- overt religious iconography or specific deities

The final artwork should feel like a fusion of:
- a painterly anime cinematic illustration
- a contemplative spiritual portrait
- an Indian lunarpunk plate
- a moment from Ethereum's Infinite Garden

Restrained yet luminous.
Devotional yet personal.
Painterly, not photographic.
Refined without being branded.
Wordless — no text, no captions, no titles, no typography of any kind.`;

// Color-theme addendum mapped to the frontend's crops slider — Devcon's
// four core values (Censorship Resistance / Open Source / Privacy /
// Security). Selecting a value shifts the dominant color family of the
// generation while keeping the overall lunarpunk-Infinite-Garden
// composition unchanged.
const CROP_COLOR_THEMES: Record<string, string> = {
  "censorship-resistance": `COLOR THEME — CRIMSON & MAGENTA DOMINANT:
Push the luminous matter toward defiant warmth. Lean into deep crimson, hot magenta, and rose-gold filaments. Magenta sparks should be plentiful; teal and cyan recede to faint background notes. Background nebula trends toward burgundy-violet rather than indigo. The garden glows with rebellious heat — still painterly, still restrained, but unmistakably warm.`,
  "open-source": `COLOR THEME — TEAL & CYAN DOMINANT:
Push the luminous matter toward oceanic openness. Lean into bright teal, glowing aqua, soft turquoise, and pale-cyan dewdrops. Tendrils and ribbons read as cool sea-light; magenta and gold recede to subtle accents only. Background nebula trends toward indigo-teal. The garden feels open, contemplative, and clear.`,
  privacy: `COLOR THEME — DEEP VIOLET & INDIGO DOMINANT:
Push the luminous matter toward shadowed secrecy. Lean into amethyst, deep electric violet, plum, and shadowed ultraviolet. Bloom is darker, more inward; teal and gold recede almost entirely. Background nebula is the deepest indigo-violet, with fewer stars and softer particles. The garden feels private and quiet.`,
  security: `COLOR THEME — WARM GOLD & AMBER DOMINANT:
Push the luminous matter toward lantern-warmth. Lean into honey-gold, burnished bronze, soft amber, and candle-warm highlights. Filaments and dewdrops glow like guarded lamplight; magenta and teal recede to subtle accents. Background nebula warms toward dusky violet-with-gold. The garden feels guarded, sheltered, and steady.`,
};

export const devconAvatarRouter: Router = Router();

// Allow ~10MB so base64-encoded source photos fit comfortably.
devconAvatarRouter.use(express.json({ limit: "10mb" }));

// Public — list of character names (used by the picker on the frontend).
devconAvatarRouter.get("/characters", (_req, res) => {
  res.json({
    characters: STYLE_REFERENCES.map((r) => characterBaseName(r.name)),
  });
});

// Returns the composed prompt that would be sent to OpenAI for a given crop
// selection. Used by the frontend's "copy prompt" affordance. Gated to
// OTP-verified users (same tier as /check) so the system prompt isn't
// scrapable by anonymous clients.
devconAvatarRouter.get("/prompt", async (req, res) => {
  const auth = await validateBearerToken(req.headers.authorization);
  if (!auth.ok) {
    if (auth.reason === "config") {
      res.status(500).json({ error: "Auth not configured on server" });
    } else {
      res.status(401).json({ error: "Invalid or missing token" });
    }
    return;
  }

  const cropParam = typeof req.query.crop === "string" ? req.query.crop.toLowerCase() : undefined;
  const themeAddendum = cropParam ? CROP_COLOR_THEMES[cropParam] : undefined;
  const prompt = themeAddendum
    ? `${INFINITE_GARDEN_PROMPT}\n\n${themeAddendum}`
    : INFINITE_GARDEN_PROMPT;
  res.json({
    prompt,
    crop: cropParam ?? null,
    themeApplied: !!themeAddendum,
  });
});

// Public — character reference image bytes. Used as <img src> in the picker.
devconAvatarRouter.get("/characters/:name", (req, res) => {
  const ref = findCharacter(req.params.name);
  if (!ref) {
    res.status(404).json({ error: "Character not found" });
    return;
  }
  res.setHeader("Content-Type", ref.mimeType);
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(Buffer.from(ref.base64, "base64"));
});

// GET /check — does this verified email have a Devcon ticket? Returns the
// existing avatar URL (if any) so the client can render it without a second hop.
devconAvatarRouter.get("/check", async (req, res) => {
  const auth = await validateBearerToken(req.headers.authorization);
  if (!auth.ok) {
    if (auth.reason === "config") {
      res.status(500).json({ error: "Auth not configured on server" });
    } else {
      res.status(401).json({ error: "Invalid or missing token" });
    }
    return;
  }

  let hasTicket = false;
  if (isWhitelisted(auth.email)) {
    hasTicket = true;
  } else {
    try {
      hasTicket = await emailHasPaidTicket(auth.email);
    } catch (err: any) {
      console.error("[devcon-avatar/check] Pretix lookup failed:", err);
      res.status(502).json({ error: "Ticket lookup failed" });
      return;
    }
  }

  let existingAvatar: string | null = null;
  if (hasTicket) {
    try {
      const ticketId = hashEmail(auth.email);
      const filePath = `${ticketId}.png`;
      const supabase = createServerClient();
      // List instead of download so we get `updated_at` for cache-busting.
      // The bucket caches the public URL for a year; without a version query
      // the browser will keep showing the same image after re-generation.
      const { data: list } = await supabase.storage
        .from(DEVCON_AVATAR_BUCKET)
        .list("", { limit: 1, search: filePath });
      const file = list?.find((f) => f.name === filePath);
      if (file) {
        const {
          data: { publicUrl },
        } = supabase.storage.from(DEVCON_AVATAR_BUCKET).getPublicUrl(filePath);
        const version = file.updated_at
          ? `?v=${encodeURIComponent(file.updated_at)}`
          : `?v=${Date.now()}`;
        existingAvatar = `${publicUrl}${version}`;
      }
    } catch {
      // Best-effort
    }
  }

  res.json({ email: auth.email, hasTicket, existingAvatar });
});

// POST / — generate a stylized portrait for the authenticated, ticketed user.
devconAvatarRouter.post("/", async (req, res) => {
  try {
    const auth = await validateBearerToken(req.headers.authorization);
    if (!auth.ok) {
      if (auth.reason === "config") {
        res.status(500).json({ error: "Auth not configured on server" });
      } else {
        res.status(401).json({ error: "Invalid or missing token" });
      }
      return;
    }

    if (!isWhitelisted(auth.email)) {
      let hasTicket = false;
      try {
        hasTicket = await emailHasPaidTicket(auth.email);
      } catch (err: any) {
        console.error("[devcon-avatar] Pretix lookup failed:", err);
        res.status(502).json({ error: "Ticket lookup failed" });
        return;
      }

      if (!hasTicket) {
        res
          .status(403)
          .json({ error: "No Devcon ticket found for this email" });
        return;
      }
    }

    const parsed = generateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid request", details: parsed.error.issues });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      res.status(500).json({ error: "OPENAI_API_KEY not configured" });
      return;
    }

    const { image, crop } = parsed.data;
    const cleanImage = image.replace(/^data:image\/[a-z]+;base64,/, "");
    const sourceMime = detectMimeFromBase64(cleanImage);

    // The crops slider sends one of the four Devcon values
    // (censorship-resistance / open-source / privacy / security). We use it
    // to layer a color-theme addendum onto the canonical
    // INFINITE_GARDEN_PROMPT so the dominant palette shifts per selection
    // while the composition stays consistent.
    const themeAddendum = crop ? CROP_COLOR_THEMES[crop.toLowerCase()] : undefined;
    const promptText = themeAddendum
      ? `${INFINITE_GARDEN_PROMPT}\n\n${themeAddendum}`
      : INFINITE_GARDEN_PROMPT;

    const ticketId = hashEmail(auth.email);
    console.log(
      `Generating Devcon avatar for ${auth.email} [crop=${crop ?? "(none)"}, theme=${themeAddendum ? "applied" : "default"}, quality=${IMAGE_QUALITY}]`,
    );

    const sourceFile = await toFile(
      Buffer.from(cleanImage, "base64"),
      `source.${sourceMime.split("/")[1] || "png"}`,
      { type: sourceMime },
    );

    const response = await openai.images.edit({
      model: "gpt-image-2-2026-04-21",
      image: sourceFile,
      prompt: promptText,
      size: "1024x1024",
      quality: IMAGE_QUALITY,
    });

    const imageBase64 = response.data?.[0]?.b64_json;
    if (!imageBase64) {
      console.error("OpenAI response:", JSON.stringify(response, null, 2));
      res.status(500).json({ error: "No image in OpenAI response" });
      return;
    }

    const imageBuffer = Buffer.from(imageBase64, "base64");
    const supabase = createServerClient();
    // Single canonical filename per user; matches what GET /check looks up so
    // re-visits show the latest avatar without per-mode suffix juggling.
    const filePath = `${ticketId}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(DEVCON_AVATAR_BUCKET)
      .upload(filePath, imageBuffer, {
        contentType: "image/png",
        cacheControl: "31536000",
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      res.status(500).json({ error: `Upload failed: ${uploadError.message}` });
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from(DEVCON_AVATAR_BUCKET)
      .getPublicUrl(uploadData.path);

    console.log(`Devcon avatar uploaded for ${auth.email}: ${publicUrl}`);

    res.json({ image: publicUrl });
  } catch (err: any) {
    // Surface the underlying cause — Node's fetch hides socket-level errors
    // (ECONNRESET, UND_ERR_SOCKET / "other side closed", DNS) in err.cause.
    // Without this we'd just log "fetch failed" and have nothing actionable.
    console.error("Devcon avatar generation error:", {
      message: err?.message,
      name: err?.name,
      code: err?.code,
      status: err?.status,
      causeMessage: err?.cause?.message,
      causeCode: err?.cause?.code,
    });
    res.status(500).json({ error: err.message || "Generation failed" });
  }
});
