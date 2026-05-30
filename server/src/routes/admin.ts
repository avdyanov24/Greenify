import { Router, Request, Response } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import { prisma } from "../db";

const router = Router();

// All admin routes require an authenticated moderator or admin.
const staff = [authenticateToken, requireRole("moderator", "admin")];
const adminOnly = [authenticateToken, requireRole("admin")];

router.get("/moderation/queue", staff, async (_req: Request, res: Response) => {
  try {
    const flags = await prisma.moderatorFlag.findMany({
      where: { status: "pending" },
      include: {
        post: {
          include: {
            user: { select: { id: true, displayName: true, username: true, isBanned: true } },
            images: { orderBy: { order: "asc" }, take: 3 },
          },
        },
      },
      orderBy: { reportCount: "desc" },
    });
    return res.json(flags);
  } catch (error) {
    return res.status(500).json({ error: "Moderation queue fetch failed" });
  }
});

router.post("/moderation/posts/:postId/approve", staff, async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    await prisma.post.update({ where: { id: postId }, data: { status: "approved" } });
    await prisma.moderatorFlag.updateMany({ where: { postId }, data: { status: "approved" } });
    return res.json({ message: "Post approved" });
  } catch (error) {
    return res.status(500).json({ error: "Approve failed" });
  }
});

router.post("/moderation/posts/:postId/reject", staff, async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    await prisma.post.update({ where: { id: postId }, data: { status: "rejected" } });
    await prisma.moderatorFlag.updateMany({ where: { postId }, data: { status: "rejected" } });
    return res.json({ message: "Post rejected" });
  } catch (error) {
    return res.status(500).json({ error: "Reject failed" });
  }
});

router.get("/users", staff, async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, username: true, displayName: true, role: true, isBanned: true,
        level: true, xp: true, greenPoints: true, createdAt: true,
        _count: { select: { posts: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(users.map((u) => ({ ...u, postCount: u._count.posts })));
  } catch (error) {
    return res.status(500).json({ error: "Fetch users failed" });
  }
});

// Ban / unban a user. Toggles isBanned (admins can't be banned).
router.post("/users/:userId/ban", staff, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { isBanned: true, role: true } });
    if (!target) return res.status(404).json({ error: "User not found" });
    if (target.role === "admin") return res.status(400).json({ error: "Cannot ban an admin" });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isBanned: !target.isBanned },
      select: { id: true, isBanned: true },
    });
    return res.json({ message: updated.isBanned ? "User banned" : "User unbanned", ...updated });
  } catch (error) {
    return res.status(500).json({ error: "Ban toggle failed" });
  }
});

router.get("/stats", staff, async (_req: Request, res: Response) => {
  try {
    const [users, posts, hexes, flags, banned] = await Promise.all([
      prisma.user.count(),
      prisma.post.count({ where: { status: "approved" } }),
      prisma.hex.count(),
      prisma.moderatorFlag.count({ where: { status: "pending" } }),
      prisma.user.count({ where: { isBanned: true } }),
    ]);
    return res.json({ users, approvedPosts: posts, hexesClaimed: hexes, pendingFlags: flags, bannedUsers: banned });
  } catch (error) {
    return res.status(500).json({ error: "Stats fetch failed" });
  }
});

// Promote a user to moderator/admin (admin only) — handy for demos.
router.post("/users/:userId/role", adminOnly, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    if (!["user", "moderator", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, role: true },
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: "Role update failed" });
  }
});

export default router;
