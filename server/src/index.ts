import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { mkdirSync, existsSync } from "fs";
import { prisma } from "./db";

import authRoutes from "./routes/auth";
import postRoutes from "./routes/posts";
import mapRoutes from "./routes/map";
import endorsementRoutes from "./routes/endorsements";
import profileRoutes from "./routes/profile";
import organizationRoutes from "./routes/organizations";
import marketplaceRoutes from "./routes/marketplace";
import voucherRoutes from "./routes/vouchers";
import subscriptionRoutes from "./routes/subscriptions";
import boostRoutes from "./routes/boosts";
import achievementRoutes from "./routes/achievements";
import adminRoutes from "./routes/admin";
import { runSeeds } from "./seed";

dotenv.config();

export { prisma };

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);

// Serve uploaded images
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date() });
});

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/map", mapRoutes);
app.use("/api/endorsements", endorsementRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/boosts", boostRoutes);
app.use("/api/achievements", achievementRoutes);
app.use("/api/admin", adminRoutes);

app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

// Serve React frontend in production (after building client)
const clientDist = path.join(process.cwd(), "..", "client", "dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req: Request, res: Response) => {
    // Don't let the SPA fallback swallow unmatched API/asset routes —
    // those should return a real JSON 404 the client can parse.
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      return res.status(404).json({ error: "Not found" });
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, async () => {
  console.log(`✓ Greenify server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || "development"}`);
  try {
    await runSeeds();
    console.log(`✓ Seed data ready (achievements, vouchers, demo content)`);
  } catch (err) {
    console.error("Seeding failed:", err);
  }
});

export default app;
