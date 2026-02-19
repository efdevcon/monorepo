import "dotenv/config";
import express from "express";
import cors from "cors";
import { searchRouter } from "./routes/search.js";
import { chatRouter } from "./routes/chat.js";
import { fuzzyRouter } from "./routes/fuzzy.js";
import { generateImageRouter } from "./routes/generate-image.js";
import { baseModelRouter } from "./routes/base-model.js";

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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

// Start server
app.listen(port, () => {
  console.log(`devcon-ai server running on port ${port}`);
});
