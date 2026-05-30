import { Router, Request, Response } from "express";
import { prisma } from "../db";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const achievements = await prisma.achievement.findMany({
      orderBy: { createdAt: "asc" },
    });
    return res.json(achievements);
  } catch (error) {
    return res.status(500).json({ error: "Fetch achievements failed" });
  }
});

router.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: "desc" },
    });
    return res.json(userAchievements);
  } catch (error) {
    return res.status(500).json({ error: "Fetch user achievements failed" });
  }
});

export default router;
