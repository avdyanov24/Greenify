import { Router, Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import { prisma } from "../db";
import { getNeighboringHexes } from "../utils/hex";
import { grantRewards, unlockAchievement } from "../utils/progression";

const router = Router();

router.post("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const endorserId = req.userId!;
    const { postId } = req.body;

    if (!postId) return res.status(400).json({ error: "postId required" });

    // Endorser must have at least 1 approved post
    const endorserPostCount = await prisma.post.count({
      where: { userId: endorserId, status: "approved" },
    });
    if (endorserPostCount < 1) {
      return res.status(403).json({ error: "You need at least 1 approved post to endorse" });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { hex: true },
    });

    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.status !== "approved") return res.status(400).json({ error: "Post must be approved to endorse" });
    if (post.userId === endorserId) return res.status(400).json({ error: "Cannot endorse your own post" });

    // Check duplicate endorsement
    const existing = await prisma.endorsement.findUnique({
      where: { postId_endorserId: { postId, endorserId } },
    });
    if (existing) return res.status(409).json({ error: "Already endorsed this post" });

    // Check endorsement cap (5 per post)
    const endorsementCount = await prisma.endorsement.count({ where: { postId } });
    const hexGranted = endorsementCount < 5 ? 1 : 0;

    const endorsement = await prisma.endorsement.create({
      data: {
        postId,
        endorserId,
        endorsedUserId: post.userId,
        hexesGranted: hexGranted,
      },
    });

    // Grant extra hex to post owner if under cap
    if (hexGranted > 0 && post.hex) {
      const neighbors = getNeighboringHexes(post.hex.h3Index);
      for (const neighborH3 of neighbors) {
        const neighborHex = await prisma.hex.findUnique({ where: { h3Index: neighborH3 } });
        if (!neighborHex) {
          await prisma.hex.create({
            data: { h3Index: neighborH3, userId: post.userId, plantCount: 0 },
          });
          break;
        }
      }
    }

    // GP/XP bonuses (endorser earns a little, post owner earns more)
    await grantRewards(endorserId, { xp: 10, gp: 2 });
    await grantRewards(post.userId, { xp: 20, gp: 5 });

    // "Endorser" achievement: endorsed 20 posts
    const endorserTotal = await prisma.endorsement.count({ where: { endorserId } });
    if (endorserTotal >= 20) await unlockAchievement(endorserId, "endorser");

    return res.status(201).json({ endorsement, hexGranted });
  } catch (error) {
    console.error("Endorsement error:", error);
    return res.status(500).json({ error: "Endorsement creation failed" });
  }
});

router.get("/post/:postId", async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const endorsements = await prisma.endorsement.findMany({
      where: { postId },
      include: {
        endorser: { select: { id: true, displayName: true, profileImage: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ endorsements, count: endorsements.length });
  } catch (error) {
    return res.status(500).json({ error: "Fetch endorsements failed" });
  }
});

router.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const endorsements = await prisma.endorsement.findMany({
      where: { endorsedUserId: userId },
      include: {
        post: { select: { id: true, title: true } },
        endorser: { select: { id: true, displayName: true, profileImage: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(endorsements);
  } catch (error) {
    return res.status(500).json({ error: "Fetch user endorsements failed" });
  }
});

router.delete("/:endorsementId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { endorsementId } = req.params;

    const endorsement = await prisma.endorsement.findUnique({ where: { id: endorsementId } });
    if (!endorsement) return res.status(404).json({ error: "Endorsement not found" });
    if (endorsement.endorserId !== userId) return res.status(403).json({ error: "Forbidden" });

    await prisma.endorsement.delete({ where: { id: endorsementId } });
    return res.json({ message: "Endorsement removed" });
  } catch (error) {
    return res.status(500).json({ error: "Endorsement deletion failed" });
  }
});

export default router;
