import { Router, Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import {
  validateBurgasLocation,
  rateLimitPostCreation,
  requireLevel,
} from "../middleware/validation";
import { getHexIndex, calculateDensityMultiplier } from "../utils/hex";
import { grantRewards, unlockAchievement } from "../utils/progression";
import { prisma } from "../db";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { createHash } from "crypto";

const router = Router();

function saveBase64Image(base64: string): string {
  const dir = join(process.cwd(), "uploads");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const match = base64.match(/^data:image\/(\w+);base64,(.+)$/);
  const ext = match ? match[1] : "jpg";
  const data = match ? match[2] : base64;
  const buf = Buffer.from(data, "base64");
  const filename = `${randomUUID()}.${ext}`;
  writeFileSync(join(dir, filename), buf);
  return `/uploads/${filename}`;
}

function hashImage(base64: string): string {
  return createHash("sha256").update(base64.slice(0, 500)).digest("hex");
}

router.post(
  "/",
  authenticateToken,
  requireLevel(3),
  validateBurgasLocation,
  rateLimitPostCreation,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { title, description, plantType, latitude, longitude, images } = req.body;

      if (!title || !plantType || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: "title, plantType, latitude, longitude required" });
      }

      if (!Array.isArray(images) || images.length !== 3) {
        return res.status(400).json({ error: "Exactly 3 images required" });
      }

      // Save images to disk
      const imageUrls = images.map((b64: string) => saveBase64Image(b64));
      const hashes = images.map((b64: string) => hashImage(b64));

      // Basic duplicate check: compare hash against existing post images
      let isDuplicate = false;
      let suspectedPostId: string | undefined;
      for (const hash of hashes) {
        const existing = await prisma.postImage.findFirst({ where: { pHash: hash } });
        if (existing) {
          isDuplicate = true;
          suspectedPostId = existing.postId;
          break;
        }
      }

      const lat = parseFloat(String(latitude));
      const lng = parseFloat(String(longitude));

      // Get or create hex
      const h3Index = getHexIndex(lat, lng);
      let hex = await prisma.hex.findUnique({ where: { h3Index } });

      if (!hex) {
        hex = await prisma.hex.create({
          data: { h3Index, userId, plantCount: 0 },
        });
      }

      const densityMultiplier = calculateDensityMultiplier(hex.plantCount);
      const baseGp = 10;
      const baseGpEarned = baseGp * densityMultiplier;
      const baseXpEarned = 50;

      const postStatus = isDuplicate ? "flagged" : "approved";

      // Create post
      const post = await prisma.post.create({
        data: {
          userId,
          title,
          description: description || "",
          plantType,
          latitude: lat,
          longitude: lng,
          status: postStatus,
          hexId: hex.id,
          aiConfidence: isDuplicate ? 1.0 : 0,
          aiDuplicate: suspectedPostId || null,
          images: {
            create: imageUrls.map((url, idx) => ({
              imageUrl: url,
              order: idx + 1,
              pHash: hashes[idx],
            })),
          },
        },
        include: {
          images: { orderBy: { order: "asc" } },
        },
      });

      if (isDuplicate) {
        await prisma.moderatorFlag.create({
          data: { postId: post.id, reason: "ai-duplicate", status: "pending" },
        });
      }

      // Update hex plant count
      await prisma.hex.update({
        where: { id: hex.id },
        data: { plantCount: { increment: 1 } },
      });

      // Grant XP and GP (honors MAX subscription multiplier). Flagged posts
      // still claim the hex but earn no rewards until a moderator approves.
      const reward = postStatus === "approved"
        ? await grantRewards(userId, { xp: baseXpEarned, gp: baseGpEarned })
        : null;
      const gpEarned = reward?.gpGain ?? 0;
      const xpEarned = reward?.xpGain ?? 0;

      // Check achievements
      const userPostCount = await prisma.post.count({
        where: { userId, status: { in: ["approved", "flagged"] } },
      });

      if (userPostCount === 1) {
        await unlockAchievement(userId, "first-plant");
      }

      if (plantType === "flower") {
        const flowerCount = await prisma.post.count({ where: { userId, plantType: "flower", status: "approved" } });
        if (flowerCount >= 5) await unlockAchievement(userId, "pollinator");
      }

      if (plantType === "tree") {
        const treeCount = await prisma.post.count({ where: { userId, plantType: "tree", status: "approved" } });
        if (treeCount >= 3) await unlockAchievement(userId, "canopy-starter");
      }

      if (hex.plantCount === 0) {
        await unlockAchievement(userId, "green-zone-pioneer");
      }

      return res.status(201).json({
        ...post,
        gpEarned,
        xpEarned,
        status: postStatus,
        isDuplicate,
        leveledUp: reward?.leveledUp ?? false,
        newLevel: reward?.newLevel,
      });
    } catch (error) {
      console.error("Post creation error:", error);
      return res.status(500).json({ error: "Post creation failed" });
    }
  },
);

router.get("/", async (req: Request, res: Response) => {
  try {
    const page = parseInt(String(req.query.page || "1"));
    const limit = parseInt(String(req.query.limit || "20"));
    const plantType = req.query.plantType as string | undefined;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { status: "approved" };
    if (plantType) where.plantType = plantType;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, username: true, displayName: true, profileImage: true } },
          images: { orderBy: { order: "asc" } },
          _count: { select: { endorsements: true } },
        },
      }),
      prisma.post.count({ where }),
    ]);

    return res.json({
      posts: posts.map((p) => ({
        ...p,
        endorsementCount: p._count.endorsements,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Fetch posts error:", error);
    return res.status(500).json({ error: "Fetch posts failed" });
  }
});

router.get("/:postId", async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: { select: { id: true, username: true, displayName: true, profileImage: true } },
        images: { orderBy: { order: "asc" } },
        endorsements: {
          include: { endorser: { select: { id: true, displayName: true, profileImage: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: { select: { endorsements: true } },
      },
    });

    if (!post) return res.status(404).json({ error: "Post not found" });
    return res.json({ ...post, endorsementCount: post._count.endorsements });
  } catch (error) {
    return res.status(500).json({ error: "Fetch post failed" });
  }
});

router.get("/:postId/comments", async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const comments = await prisma.comment.findMany({
      where: { postId },
      include: { user: { select: { id: true, displayName: true, profileImage: true } } },
      orderBy: { createdAt: "asc" },
    });
    return res.json(comments);
  } catch (error) {
    return res.status(500).json({ error: "Fetch comments failed" });
  }
});

router.post("/:postId/comments", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { postId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Comment text required" });
    }

    const comment = await prisma.comment.create({
      data: { postId, userId, text: text.trim() },
      include: { user: { select: { id: true, displayName: true, profileImage: true } } },
    });

    return res.status(201).json(comment);
  } catch (error) {
    return res.status(500).json({ error: "Comment creation failed" });
  }
});

router.post("/:postId/report", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { reason } = req.body;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const existing = await prisma.moderatorFlag.findFirst({ where: { postId, reason: "community-report" } });

    if (existing) {
      const updated = await prisma.moderatorFlag.update({
        where: { id: existing.id },
        data: { reportCount: { increment: 1 } },
      });
      if (updated.reportCount >= 5) {
        await prisma.post.update({ where: { id: postId }, data: { status: "flagged" } });
      }
    } else {
      await prisma.moderatorFlag.create({
        data: { postId, reason: reason || "community-report", status: "pending" },
      });
    }

    return res.json({ message: "Report submitted" });
  } catch (error) {
    return res.status(500).json({ error: "Report submission failed" });
  }
});

export default router;
