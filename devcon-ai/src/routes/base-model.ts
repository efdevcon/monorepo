import { Router } from "express";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const REFERENCE_IMAGE_PATH = path.join(
  process.cwd(),
  "image-references/mumbai-character.png"
);

function loadReferenceImage(): { base64: string; mimeType: string } {
  const buffer = fs.readFileSync(REFERENCE_IMAGE_PATH);
  return { base64: buffer.toString("base64"), mimeType: "image/png" };
}

const requestSchema = z.object({
  prompt: z.string().min(1),
});

const GEMINI_IMAGE_CONFIG = {
  responseModalities: ["TEXT", "IMAGE"] as string[],
  imageConfig: {
    aspectRatio: "1:1" as const,
  },
};

export const baseModelRouter: Router = Router();

baseModelRouter.post("/", async (req, res) => {
  try {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({ error: "GEMINI_API_KEY not configured" });
      return;
    }

    const { prompt } = parsed.data;
    const ref = loadReferenceImage();

    console.log(`[base-model] Generating with prompt: "${prompt.slice(0, 80)}..."`);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        {
          role: "user" as const,
          parts: [
            { text: prompt },
            { inlineData: { mimeType: ref.mimeType, data: ref.base64 } },
          ],
        },
      ],
      config: GEMINI_IMAGE_CONFIG,
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      res.status(500).json({ error: "No response from Gemini" });
      return;
    }

    let imageBase64: string | undefined;
    let mimeType: string | undefined;
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith("image/")) {
        imageBase64 = part.inlineData.data;
        mimeType = part.inlineData.mimeType;
        break;
      }
    }

    if (!imageBase64) {
      console.error("Gemini response parts:", JSON.stringify(parts, null, 2));
      res.status(500).json({ error: "No image in Gemini response" });
      return;
    }

    console.log("[base-model] Image generated successfully");

    res.json({ image: `data:${mimeType};base64,${imageBase64}` });
  } catch (err: any) {
    console.error("[base-model] Error:", err);
    res.status(500).json({ error: err.message || "Generation failed" });
  }
});
