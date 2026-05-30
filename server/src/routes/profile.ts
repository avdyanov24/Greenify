import { Router, Request, Response } from "express";
import { authenticateToken, optionalAuth } from "../middleware/auth";
import { prisma } from "../db";

const router = Router();

router.get("/me", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        bio: true,
        bioForHire: true,
        profileImage: true,
        role: true,
        isBanned: true,
        level: true,
        xp: true,
        greenPoints: true,
        availableForHire: true,
        averageRating: true,
        createdAt: true,
        subscription: { select: { type: true, status: true } },
        _count: { select: { hexes: true, posts: true, followers: true, following: true } },
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const achievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
    });

    return res.json({
      ...user,
      hexCount: user._count.hexes,
      postCount: user._count.posts,
      followerCount: user._count.followers,
      followingCount: user._count.following,
      achievements,
    });
  } catch (error) {
    console.error("My profile error:", error);
    return res.status(500).json({ error: "My profile fetch failed" });
  }
});

// Leaderboard — registered BEFORE /:userId so it isn't shadowed by the param route.
router.get("/leaderboard", async (req: Request, res: Response) => {
  try {
    const sort = (req.query.sort as string) || "gp";

    if (sort === "hexes") {
      const users = await prisma.user.findMany({
        where: { isBanned: false },
        select: {
          id: true, username: true, displayName: true, profileImage: true,
          level: true, xp: true, greenPoints: true,
          _count: { select: { hexes: true } },
        },
        take: 50,
      });
      const ranked = users
        .map((u) => ({ ...u, hexCount: u._count.hexes }))
        .sort((a, b) => b.hexCount - a.hexCount)
        .slice(0, 25);
      return res.json(ranked);
    }

    const orderBy = sort === "xp" ? { xp: "desc" as const } : { greenPoints: "desc" as const };
    const users = await prisma.user.findMany({
      where: { isBanned: false },
      orderBy,
      take: 25,
      select: {
        id: true, username: true, displayName: true, profileImage: true,
        level: true, xp: true, greenPoints: true,
        _count: { select: { hexes: true } },
      },
    });
    return res.json(users.map((u) => ({ ...u, hexCount: u._count.hexes })));
  } catch (error) {
    console.error("Leaderboard error:", error);
    return res.status(500).json({ error: "Leaderboard fetch failed" });
  }
});

router.get("/:userId", optionalAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const viewerId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        bioForHire: true,
        profileImage: true,
        role: true,
        level: true,
        xp: true,
        greenPoints: true,
        availableForHire: true,
        averageRating: true,
        createdAt: true,
        _count: { select: { hexes: true, followers: true, following: true } },
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const posts = await prisma.post.findMany({
      where: { userId, status: "approved" },
      orderBy: { createdAt: "desc" },
      include: {
        images: { orderBy: { order: "asc" }, take: 1 },
        _count: { select: { endorsements: true } },
      },
    });

    const achievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
    });

    let isFollowing = false;
    if (viewerId && viewerId !== userId) {
      const follow = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: userId } },
      });
      isFollowing = !!follow;
    }

    return res.json({
      ...user,
      hexCount: user._count.hexes,
      followerCount: user._count.followers,
      followingCount: user._count.following,
      isFollowing,
      posts: posts.map((p) => ({ ...p, endorsementCount: p._count.endorsements })),
      achievements: achievements.map((a) => a.achievement),
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return res.status(500).json({ error: "Profile fetch failed" });
  }
});

router.patch("/me", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { displayName, bio, bioForHire, availableForHire } = req.body;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(bioForHire !== undefined && { bioForHire }),
        ...(availableForHire !== undefined && { availableForHire }),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        bioForHire: true,
        profileImage: true,
        level: true,
        xp: true,
        greenPoints: true,
        availableForHire: true,
      },
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: "Profile update failed" });
  }
});

router.post("/follow/:userId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const followerId = req.userId!;
    const { userId: followingId } = req.params;

    if (followerId === followingId) return res.status(400).json({ error: "You can't follow yourself" });

    const target = await prisma.user.findUnique({ where: { id: followingId }, select: { id: true } });
    if (!target) return res.status(404).json({ error: "User not found" });

    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      update: {},
      create: { followerId, followingId },
    });
    return res.json({ message: "Followed", isFollowing: true });
  } catch (error) {
    return res.status(500).json({ error: "Follow failed" });
  }
});

router.delete("/follow/:userId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const followerId = req.userId!;
    const { userId: followingId } = req.params;

    await prisma.follow.deleteMany({ where: { followerId, followingId } });
    return res.json({ message: "Unfollowed", isFollowing: false });
  } catch (error) {
    return res.status(500).json({ error: "Unfollow failed" });
  }
});

export default router;
