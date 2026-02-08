import "dotenv/config";
import express from "express";
import cors from "cors";
import { searchRouter } from "./routes/search.js";
import { chatRouter } from "./routes/chat.js";
import { fuzzyRouter } from "./routes/fuzzy.js";

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

// Start server
app.listen(port, () => {
  console.log(`devcon-ai server running on port ${port}`);
});
