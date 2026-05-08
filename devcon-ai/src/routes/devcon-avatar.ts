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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// "low" | "medium" | "high" — controls cost and quality. Roughly $0.01 / $0.04 / $0.17 per image.
const IMAGE_QUALITY = (process.env.OPENAI_IMAGE_QUALITY || "medium") as
  | "low"
  | "medium"
  | "high";

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
  mode: z.enum(["style", "character", "accessories"]).default("style"),
  // Required when mode === "character" or "accessories". Filename without extension (e.g. "aria").
  character: z.string().optional(),
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

function buildAccessoriesPrompt(characterName: string): string {
  return `Photo: one or more real people. Reference: an illustrated character named "${characterName}".

Add the character's signature accessories (hat/headwear, glasses, jewelry, gear, scarf, badge, cloak, etc.) onto each person in the photo, and lightly restyle the rendering in the reference's illustration style.

Hard rules:
- Keep every face exactly as it is in the photo — same likeness, same proportions, same expression, same skin tone. Do not redraw or restyle facial geometry.
- Keep each person's pose, body, hair, clothing, and gender presentation unchanged.
- Only add accessories — don't replace clothing.
- Keep the same number of people in the same positions. Don't add, remove, merge, or duplicate anyone.
- Square portrait, no text or watermarks.`;
}

function buildCharacterPrompt(characterName: string): string {
  return `Photo: one or more real people. Reference: an illustrated character named "${characterName}".

Place each person from the photo into this character's costume, accessories, and scene, rendered in the reference's illustration style.

Hard rules:
- Keep every face exactly as it is in the photo — same likeness, same proportions, same expression, same skin tone. Do not redraw or restyle facial geometry.
- Keep each person's gender presentation, body type, and approximate age unchanged.
- Keep each person's hair color and length; tuck under hoods or hats only if the costume requires it.
- Keep the same number of people in the same relative positions. Don't add, remove, merge, or duplicate anyone.
- Square portrait, no text or watermarks.`;
}

function buildPrompt(
  numStyleRefs: number,
  featuredCharacterName?: string,
): string {
  const featured = featuredCharacterName?.trim();
  const otherRefsCount = featured
    ? Math.max(0, numStyleRefs - 1)
    : numStyleRefs;

  const intro = featured
    ? `Photo: one or more real people. Reference 1: featured character "${featured}" — only its accessories should be added.${otherRefsCount > 0 ? ` Reference${otherRefsCount > 1 ? "s" : ""} 2${otherRefsCount > 1 ? `–${otherRefsCount + 1}` : ""}: additional style guidance only (don't copy their faces, hair, or clothing).` : ""}`
    : numStyleRefs === 1
      ? "Photo: one or more real people. Reference: an illustration style."
      : `Photo: one or more real people. References: ${numStyleRefs} examples of one shared illustration style (don't copy any character's face, hair, or clothing).`;

  const accessoryClause = featured
    ? `\nAlso add the featured character's signature accessories (hats, headwear, glasses, jewelry, gear, scarves, badges, cloaks, etc.) on top of each person's existing clothing — fit to each person's pose. Don't take the character's face, hair, body, clothing, or pose — only accessories.`
    : "";

  return `${intro}

Restyle the photo in the reference illustration style.${accessoryClause}

Hard rules:
- Keep every face exactly as it is in the photo — same likeness, same proportions, same expression, same skin tone. Do not redraw or restyle facial geometry; restyle the rendering around it.
- Keep each person's pose, body, hair, clothing, and gender presentation unchanged.
- Keep the background subject matter and composition; just reinterpret it in the new style.
- Keep the same number of people in the same positions. Don't add, remove, merge, or duplicate anyone.
- This is a style transfer${featured ? " plus accessory overlay" : ""}, not a redesign.
- Square portrait, no text or watermarks.`;
}

export const devconAvatarRouter: Router = Router();

// Allow ~10MB so base64-encoded source photos fit comfortably.
devconAvatarRouter.use(express.json({ limit: "10mb" }));

// Public — list of character names (used by the picker on the frontend).
devconAvatarRouter.get("/characters", (_req, res) => {
  res.json({
    characters: STYLE_REFERENCES.map((r) => characterBaseName(r.name)),
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
      const { data } = await supabase.storage
        .from(DEVCON_AVATAR_BUCKET)
        .download(filePath);
      if (data) {
        const {
          data: { publicUrl },
        } = supabase.storage.from(DEVCON_AVATAR_BUCKET).getPublicUrl(filePath);
        existingAvatar = publicUrl;
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

    const { image, mode, character } = parsed.data;
    const cleanImage = image.replace(/^data:image\/[a-z]+;base64,/, "");
    const sourceMime = detectMimeFromBase64(cleanImage);

    if (STYLE_REFERENCES.length === 0) {
      res
        .status(500)
        .json({ error: "No style reference images configured on server" });
      return;
    }

    let promptText: string;
    let referenceImages: Array<{
      base64: string;
      mimeType: string;
      name: string;
    }>;
    let storageSuffix = "";

    if (mode === "character" || mode === "accessories") {
      if (!character) {
        res
          .status(400)
          .json({ error: `character is required when mode=${mode}` });
        return;
      }
      const ref = findCharacter(character);
      if (!ref) {
        res.status(400).json({
          error: `Unknown character "${character}". Available: ${STYLE_REFERENCES.map((r) => characterBaseName(r.name)).join(", ")}`,
        });
        return;
      }
      const charName = characterBaseName(ref.name);
      promptText =
        mode === "character"
          ? buildCharacterPrompt(charName)
          : buildAccessoriesPrompt(charName);
      referenceImages = [ref];
      storageSuffix =
        mode === "character"
          ? `-${charName.toLowerCase()}`
          : `-acc-${charName.toLowerCase()}`;
    } else {
      // style mode: optionally feature one character so its accessories get added.
      // Reorder refs so the featured character is first; the prompt instructs the
      // model to take *only* its accessories, while using the rest for style.
      let featuredName: string | undefined;
      if (character) {
        const featuredRef = findCharacter(character);
        if (featuredRef) {
          featuredName = characterBaseName(featuredRef.name);
          referenceImages = [
            featuredRef,
            ...STYLE_REFERENCES.filter((r) => r.name !== featuredRef.name),
          ];
          storageSuffix = `-style-${featuredName.toLowerCase()}`;
        } else {
          referenceImages = STYLE_REFERENCES;
        }
      } else {
        referenceImages = STYLE_REFERENCES;
      }
      promptText = buildPrompt(referenceImages.length, featuredName);
    }

    const ticketId = hashEmail(auth.email);
    console.log(
      `Generating Devcon avatar for ${auth.email} [mode=${mode}${character ? `, character=${character}` : ""}, quality=${IMAGE_QUALITY}]`,
    );

    // OpenAI gpt-image-1 expects File-like objects. Convert source + each
    // reference from base64 to File via the SDK helper.
    const sourceFile = await toFile(
      Buffer.from(cleanImage, "base64"),
      `source.${sourceMime.split("/")[1] || "png"}`,
      { type: sourceMime },
    );
    const refFiles = await Promise.all(
      referenceImages.map((ref, i) =>
        toFile(Buffer.from(ref.base64, "base64"), `ref-${i}-${ref.name}`, {
          type: ref.mimeType,
        }),
      ),
    );

    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: [sourceFile, ...refFiles],
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
    const filePath = `${ticketId}${storageSuffix}.png`;

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
    console.error("Devcon avatar generation error:", err);
    res.status(500).json({ error: err.message || "Generation failed" });
  }
});
