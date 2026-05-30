import { Router, Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import { prisma } from "../db";

const router = Router();

// €2 / week single-item promotion. Payment is deferred per MVP scope, so this
// activates the boost immediately ("mock checkout").
const BOOST_COST_EUR = 2.0;
const BOOST_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

router.get("/active", async (_req: Request, res: Response) => {
  try {
    const boosts = await prisma.boost.findMany({
      where: { expiresAt: { gt: new Date() } },
      select: { id: true, postId: true, taskId: true, expiresAt: true },
    });
    return res.json(boosts);
  } catch (error) {
    return res.status(500).json({ error: "Fetch boosts failed" });
  }
});

router.post("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { postId, taskId } = req.body;

    if (!postId && !taskId) {
      return res.status(400).json({ error: "postId or taskId required" });
    }

    // Ownership check
    if (postId) {
      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (!post) return res.status(404).json({ error: "Post not found" });
      if (post.userId !== userId) return res.status(403).json({ error: "You can only boost your own post" });
    }
    if (taskId) {
      const task = await prisma.marketplaceTask.findUnique({ where: { id: taskId } });
      if (!task) return res.status(404).json({ error: "Task not found" });
      if (task.posterId !== userId) return res.status(403).json({ error: "You can only boost your own task" });
    }

    const boost = await prisma.boost.create({
      data: {
        userId,
        postId: postId || null,
        taskId: taskId || null,
        costEur: BOOST_COST_EUR,
        expiresAt: new Date(Date.now() + BOOST_DURATION_MS),
      },
    });
    return res.status(201).json(boost);
  } catch (error) {
    return res.status(500).json({ error: "Boost failed" });
  }
});

router.get("/:boostId", async (req: Request, res: Response) => {
  try {
    const boost = await prisma.boost.findUnique({ where: { id: req.params.boostId } });
    if (!boost) return res.status(404).json({ error: "Boost not found" });
    return res.json(boost);
  } catch (error) {
    return res.status(500).json({ error: "Fetch boost failed" });
  }
});

export default router;
