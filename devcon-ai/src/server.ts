import "dotenv/config";
import express from "express";
import cors from "cors";
import { searchRouter } from "./routes/search.js";
import { chatRouter } from "./routes/chat.js";
import { fuzzyRouter } from "./routes/fuzzy.js";
import { generateImageRouter } from "./routes/generate-image.js";
import { baseModelRouter } from "./routes/base-model.js";
import { devconAvatarRouter } from "./routes/devcon-avatar.js";

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
// Default express.json() limit is 100KB, which 413s base64-encoded images.
// Frontend caps uploads at 5MB; allow 10MB to cover base64 inflation + headroom.
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/search", searchRouter);
app.use("/api/chat", chatRouter);
app.use("/api/fuzzy", fuzzyRouter);
app.use("/api/generate-image", generateImageRouter);
app.use("/api/base-model", baseModelRouter);
app.use("/api/devcon-avatar", devconAvatarRouter);

// Start server
app.listen(port, () => {
  console.log(`devcon-ai server running on port ${port}`);
});
