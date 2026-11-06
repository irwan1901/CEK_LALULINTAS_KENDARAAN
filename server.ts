import express from "express";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import analyzeHandler from "./api/analyze.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);
  const isProduction = process.env.NODE_ENV === "production";

  // Parse JSON with generous limit for vehicle crops (base64 images)
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      appName: "LPR-Brand Vision",
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API analyze endpoint
  app.post("/api/analyze", async (req, res) => {
    try {
      await analyzeHandler(req, res);
    } catch (err: any) {
      console.error("Unhandled error in /api/analyze:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message || "Internal Server Error" });
      }
    }
  });

  if (!isProduction) {
    // In dev mode, mount Vite middleware
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        port: PORT,
        hmr: process.env.DISABLE_HMR !== "true",
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log(`[LPR-Brand Vision] Vite dev middleware mounted`);
  } else {
    // In production, serve dist folder
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[LPR-Brand Vision] CCTV Surveillance Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
