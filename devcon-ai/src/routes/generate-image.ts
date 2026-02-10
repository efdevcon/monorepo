import { Router } from "express";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { removeBackground } from "@imgly/background-removal-node";
import { createServerClient } from "../lib/supabase.js";
import fs from "fs";
import path from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const CHARACTER_SHEET_PATH = path.join(
  process.cwd(),
  "image-references/mumbai-character.png",
);

const BASE_MODEL_PATH = path.join(
  process.cwd(),
  "image-references/base-model.png",
);

const BG_REFERENCE_PATH = path.join(
  process.cwd(),
  "image-references/dc8-bg.png",
);

const AVATAR_BUCKET = "mumbai-avatars";

function loadImage(filePath: string): { base64: string; mimeType: string } {
  const buffer = fs.readFileSync(filePath);
  return { base64: buffer.toString("base64"), mimeType: "image/png" };
}

const generateSchema = z.object({
  ticketId: z.string().min(1),
  style: z.string().min(1),
  vibe: z.string().min(1),
  spirit: z.string().min(1),
  ticketType: z.string().min(1),
  mode: z.enum(["creative", "strict", "uber-strict", "layered"]).default("strict"),
});

const GEMINI_IMAGE_CONFIG = {
  responseModalities: ["TEXT", "IMAGE"] as string[],
  imageConfig: {
    aspectRatio: "1:1" as const,
  },
};

function buildCreativePrompt(input: z.infer<typeof generateSchema>): string {
  return `Look at the reference character in IMAGE 1. This is a glowing spirit fox mascot for Devcon 8 (Ethereum conference in Mumbai, India).

Generate a NEW VARIATION of this character as a unique avatar based on the following attendee choices:

ATTENDEE PROFILE:
- Ticket type: ${input.ticketType}
- Art style preference: ${input.style}
- Vibe: ${input.vibe}
- Spirit animal/symbol: ${input.spirit}

INSTRUCTIONS:
- Keep the same general aesthetic and feel as the reference character (glowing, ethereal, cute mascot style on a dark starry background).
- Transform the character to incorporate the chosen spirit animal — e.g. if "Elephant", reshape the character into a glowing elephant with the same art style. If "Phoenix", make it a glowing phoenix, etc.
- Apply the chosen art style as an influence on the rendering (e.g. "Pixel Art" means a pixelated version, "Watercolor" means soft painted edges, "Ukiyo-e" means Japanese woodblock style, etc.)
- Let the vibe influence the mood, pose, expression, and color tones (e.g. "Chaotic" = energetic, sparks flying; "Zen" = calm, meditative pose; "Mystical" = extra magical particles and glow).
- Keep the deep blue/purple/teal color palette from the reference but allow the vibe and style to shift accent colors.
- Single character, centered, square composition suitable for circular crop.
- Do NOT include any text or words in the image.`;
}

function buildStrictPrompt(input: z.infer<typeof generateSchema>): string {
  return `IMAGE 1 is the EXACT base model character you must replicate. This is a glowing teal/cyan spirit fox mascot for Devcon 8 (Ethereum conference in Mumbai).

IMAGE 2 is the color/mood reference — a dreamy nighttime Mumbai scene with a starry sky, deep navy blues, soft purple nebula clouds, teal moonlight, and glowing particles. Use this as your color and atmosphere guide.

You MUST keep the following IDENTICAL to the base model (IMAGE 1):
- The exact same pose (standing upright, front-facing, paws together)
- The exact same body proportions and silhouette
- The exact same composition and framing (centered, full body)

BACKGROUND: Use the color palette and starry atmosphere from IMAGE 2 — deep navy/indigo sky with subtle purple nebula tones, scattered stars, and soft teal/cyan glow. The background should feel like the character is standing in the world of IMAGE 2, not on a plain black background.

Now ONLY modify the character's appearance based on these attendee choices:

ATTENDEE CHOICES:
- Art style: ${input.style}
- Vibe: ${input.vibe}
- Spirit element: ${input.spirit}
- Ticket type: ${input.ticketType}

WHAT TO CHANGE (while keeping the pose/composition locked):
- COLORS: Shift the glow color based on the vibe (e.g. "Mystical" = purple glow, "Optimistic" = warm gold glow, "Rebellious" = red/orange glow, "Zen" = soft green glow). Keep it as a glowing ethereal character.
- ACCESSORIES/DETAILS: Add small accessories or visual details inspired by the spirit element (e.g. "Phoenix" = small flame wisps around the tail/ears, "Elephant" = subtle trunk-like ear shape, "Dragon" = small horn nubs and scale texture, "Owl" = rounder eyes and feather texture). These should be SUBTLE modifications, not a full species change.
- RENDERING STYLE: Apply the art style as a rendering filter (e.g. "Pixel Art" = pixelated edges, "Watercolor" = soft bleeding edges, "Ukiyo-e" = flat color blocks with outlines). The character shape stays the same.
- EXPRESSION: Adjust the facial expression to match the vibe.

CRITICAL RULES:
- The pose MUST be identical to the base model. Do not change the stance, angle, or body position.
- The character must remain recognizably the same fox mascot — do NOT turn it into a different animal.
- Use the starry night color theme from IMAGE 2 for the background.
- Square format, centered, suitable for circular crop.
- Do NOT include any text or words in the image.`;
}

function buildUberStrictPrompt(input: z.infer<typeof generateSchema>): string {
  return `IMAGE 1 is the EXACT base model character you must replicate. This is a glowing teal/cyan spirit fox mascot for Devcon 8 (Ethereum conference in Mumbai).

You MUST keep the following IDENTICAL to the base model:
- The exact same pose (standing upright, front-facing, paws together)
- The exact same body proportions and silhouette
- The exact same composition and framing (centered, full body)

BACKGROUND: PURE BLACK (#000000). No stars, no gradients, no particles, no scenery. Just the character on a completely black background. This is critical — the character will be composited onto a separate background later.

Now ONLY modify the character's appearance based on these attendee choices:

ATTENDEE CHOICES:
- Art style: ${input.style}
- Vibe: ${input.vibe}
- Spirit element: ${input.spirit}
- Ticket type: ${input.ticketType}

WHAT TO CHANGE (while keeping the pose/composition locked):
- COLORS: Shift the glow color based on the vibe (e.g. "Mystical" = purple glow, "Optimistic" = warm gold glow, "Rebellious" = red/orange glow, "Zen" = soft green glow). Keep it as a glowing ethereal character.
- ACCESSORIES/DETAILS: Add small accessories or visual details inspired by the spirit element (e.g. "Phoenix" = small flame wisps around the tail/ears, "Elephant" = subtle trunk-like ear shape, "Dragon" = small horn nubs and scale texture, "Owl" = rounder eyes and feather texture). These should be SUBTLE modifications, not a full species change.
- RENDERING STYLE: Apply the art style as a rendering filter (e.g. "Pixel Art" = pixelated edges, "Watercolor" = soft bleeding edges, "Ukiyo-e" = flat color blocks with outlines). The character shape stays the same.
- EXPRESSION: Adjust the facial expression to match the vibe.

CRITICAL RULES:
- The pose MUST be identical to the base model. Do not change the stance, angle, or body position.
- The character must remain recognizably the same fox mascot — do NOT turn it into a different animal.
- Background MUST be pure black (#000000). No exceptions.
- The character's glow/particles should fade to black at the edges — no hard cutoffs.
- Square format, centered, suitable for circular crop.
- Do NOT include any text or words in the image.`;
}

type Mode = "creative" | "strict" | "uber-strict" | "layered";

function buildContents(prompt: string, mode: Mode) {
  const ref = loadImage(
    mode === "creative" ? CHARACTER_SHEET_PATH : BASE_MODEL_PATH,
  );
  // "layered" uses same content structure as "uber-strict" (base model only, no bg)
  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [
    { text: prompt },
    { inlineData: { mimeType: ref.mimeType, data: ref.base64 } },
  ];

  if (mode === "strict") {
    const bg = loadImage(BG_REFERENCE_PATH);
    parts.push({ inlineData: { mimeType: bg.mimeType, data: bg.base64 } });
  }

  return [{ role: "user" as const, parts }];
}

export const generateImageRouter: Router = Router();

// POST / — generate a new avatar
generateImageRouter.post("/", async (req, res) => {
  try {
    const parsed = generateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid request", details: parsed.error.issues });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({ error: "GEMINI_API_KEY not configured" });
      return;
    }

    const { ticketId, mode } = parsed.data;
    const prompt =
      mode === "uber-strict" || mode === "layered"
        ? buildUberStrictPrompt(parsed.data)
        : mode === "strict"
          ? buildStrictPrompt(parsed.data)
          : buildCreativePrompt(parsed.data);
    const contents = buildContents(prompt, mode);

    console.log(
      `Generating avatar [${mode}] for ticket ${ticketId} — style: ${parsed.data.style}, vibe: ${parsed.data.vibe}, spirit: ${parsed.data.spirit}`,
    );

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: contents,
      config: GEMINI_IMAGE_CONFIG,
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      res.status(500).json({ error: "No response from Gemini" });
      return;
    }

    let imageBase64: string | undefined;
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith("image/")) {
        imageBase64 = part.inlineData.data;
        break;
      }
    }

    if (!imageBase64) {
      console.error("Gemini response parts:", JSON.stringify(parts, null, 2));
      res.status(500).json({ error: "No image in Gemini response" });
      return;
    }

    // For "layered" mode, remove the background using ML
    let imageBuffer = Buffer.from(imageBase64, "base64");
    if (mode === "layered") {
      console.log(`Removing background for ticket ${ticketId}...`);
      const blob = new Blob([imageBuffer], { type: "image/png" });
      const resultBlob = await removeBackground(blob);
      const arrayBuffer = await resultBlob.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
      console.log(`Background removed for ticket ${ticketId}`);
    }

    // Upload to Supabase storage
    const supabase = createServerClient();
    const filePath = `${ticketId}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
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
    } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(uploadData.path);

    console.log(`Avatar uploaded for ticket ${ticketId}: ${publicUrl}`);

    res.json({ image: publicUrl });
  } catch (err: any) {
    console.error("Image generation error:", err);
    res.status(500).json({ error: err.message || "Image generation failed" });
  }
});

// GET /:ticketId — get existing avatar for a ticket
generateImageRouter.get("/:ticketId", async (req, res) => {
  try {
    const { ticketId } = req.params;
    const supabase = createServerClient();
    const filePath = `${ticketId}.png`;

    const {
      data: { publicUrl },
    } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);

    // Check if the file actually exists by doing a HEAD-style download
    const { data, error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .download(filePath);

    if (error || !data) {
      res.json({ avatar: null });
      return;
    }

    res.json({ avatar: publicUrl });
  } catch (err: any) {
    console.error("Fetch avatar error:", err);
    res.status(500).json({ error: err.message });
  }
});

/*
BACKGROUND REMOVAL? 
 https://img.ly/showcases/cesdk/background-removal/web?utm_source=github&utm_medium=project&utm_campaign=vectorizer
*/
