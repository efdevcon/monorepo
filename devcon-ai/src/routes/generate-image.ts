import { Router } from "express";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { createServerClient } from "../lib/supabase.js";
import fs from "fs";
import path from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const REFERENCE_IMAGE_PATH = path.join(
  process.cwd(),
  "image-references/mumbai-character.png"
);

const AVATAR_BUCKET = "mumbai-avatars";

function loadReferenceImage(): { base64: string; mimeType: string } {
  const buffer = fs.readFileSync(REFERENCE_IMAGE_PATH);
  return { base64: buffer.toString("base64"), mimeType: "image/png" };
}

const generateSchema = z.object({
  ticketId: z.string().min(1),
  style: z.string().min(1),
  vibe: z.string().min(1),
  spirit: z.string().min(1),
  ticketType: z.string().min(1),
});

const GEMINI_IMAGE_CONFIG = {
  responseModalities: ["TEXT", "IMAGE"] as string[],
  imageConfig: {
    aspectRatio: "1:1" as const,
  },
};

function buildPrompt(input: z.infer<typeof generateSchema>): string {
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

function buildContents(prompt: string) {
  const ref = loadReferenceImage();
  return [
    {
      role: "user" as const,
      parts: [
        { text: prompt },
        { inlineData: { mimeType: ref.mimeType, data: ref.base64 } },
      ],
    },
  ];
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

    const { ticketId } = parsed.data;
    const prompt = buildPrompt(parsed.data);
    const contents = buildContents(prompt);

    console.log(
      `Generating avatar for ticket ${ticketId} — style: ${parsed.data.style}, vibe: ${parsed.data.vibe}, spirit: ${parsed.data.spirit}`
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
      console.error(
        "Gemini response parts:",
        JSON.stringify(parts, null, 2)
      );
      res.status(500).json({ error: "No image in Gemini response" });
      return;
    }

    // Upload to Supabase storage
    const supabase = createServerClient();
    const filePath = `${ticketId}.png`;
    const imageBuffer = Buffer.from(imageBase64, "base64");

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
    res
      .status(500)
      .json({ error: err.message || "Image generation failed" });
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
