import { Router, Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import { requireLevel } from "../middleware/validation";
import { prisma } from "../db";
import { grantRewards, unlockAchievement, recomputeAverageRating } from "../utils/progression";

const router = Router();

// ----------------------------------------------------------------------------
// TASKS
// ----------------------------------------------------------------------------

router.get("/tasks", async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || "open";
    const tasks = await prisma.marketplaceTask.findMany({
      where: status === "all" ? {} : { status },
      orderBy: { createdAt: "desc" },
      include: {
        poster: { select: { id: true, displayName: true, profileImage: true, averageRating: true } },
        boosts: { where: { expiresAt: { gt: new Date() } }, select: { id: true } },
        _count: { select: { applications: true } },
      },
    });
    // Promoted (boosted) tasks float to the top
    const sorted = tasks
      .map((t) => ({ ...t, promoted: t.boosts.length > 0, applicationCount: t._count.applications }))
      .sort((a, b) => Number(b.promoted) - Number(a.promoted));
    return res.json(sorted);
  } catch (error) {
    return res.status(500).json({ error: "Fetch tasks failed" });
  }
});

// Only Level 3+ users can post tasks (same gate as creating planting posts).
router.post("/tasks", authenticateToken, requireLevel(3), async (req: Request, res: Response) => {
  try {
    const posterId = req.userId!;
    const { title, description, budgetGP } = req.body;

    if (!title || !description || budgetGP === undefined) {
      return res.status(400).json({ error: "title, description, budgetGP required" });
    }
    const budget = parseInt(budgetGP);
    if (isNaN(budget) || budget <= 0) {
      return res.status(400).json({ error: "Budget must be a positive number of GP" });
    }

    const poster = await prisma.user.findUnique({ where: { id: posterId }, select: { greenPoints: true } });
    if (!poster || poster.greenPoints < budget) {
      return res.status(400).json({ error: "You don't have enough Green Points to fund this task" });
    }

    const task = await prisma.marketplaceTask.create({
      data: { posterId, title, description, budgetGP: budget },
    });
    return res.status(201).json(task);
  } catch (error) {
    return res.status(500).json({ error: "Task creation failed" });
  }
});

router.get("/tasks/:taskId", async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const task = await prisma.marketplaceTask.findUnique({
      where: { id: taskId },
      include: {
        poster: { select: { id: true, displayName: true, profileImage: true, averageRating: true } },
        assignedWorker: { select: { id: true, displayName: true, profileImage: true } },
        applications: {
          orderBy: { createdAt: "asc" },
          include: { applicant: { select: { id: true, displayName: true, profileImage: true, averageRating: true } } },
        },
      },
    });
    if (!task) return res.status(404).json({ error: "Task not found" });
    return res.json(task);
  } catch (error) {
    return res.status(500).json({ error: "Fetch task failed" });
  }
});

// Tasks I posted + tasks assigned to me (for managing applications / completion).
router.get("/my-tasks", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const [posted, assigned] = await Promise.all([
      prisma.marketplaceTask.findMany({
        where: { posterId: userId },
        orderBy: { createdAt: "desc" },
        include: {
          assignedWorker: { select: { id: true, displayName: true } },
          applications: {
            include: { applicant: { select: { id: true, displayName: true, profileImage: true, averageRating: true } } },
          },
        },
      }),
      prisma.marketplaceTask.findMany({
        where: { assignedWorkerId: userId },
        orderBy: { createdAt: "desc" },
        include: { poster: { select: { id: true, displayName: true } } },
      }),
    ]);
    return res.json({ posted, assigned });
  } catch (error) {
    return res.status(500).json({ error: "Fetch my tasks failed" });
  }
});

// ----------------------------------------------------------------------------
// APPLICATIONS
// ----------------------------------------------------------------------------

router.post("/applications", authenticateToken, async (req: Request, res: Response) => {
  try {
    const applicantId = req.userId!;
    const { taskId, proposedGP } = req.body;

    if (!taskId) return res.status(400).json({ error: "taskId required" });

    // Trust gate: must have at least 1 approved planting post to apply for work.
    const approvedPosts = await prisma.post.count({ where: { userId: applicantId, status: "approved" } });
    if (approvedPosts < 1) {
      return res.status(403).json({ error: "You need at least 1 approved planting post before applying for tasks" });
    }

    const task = await prisma.marketplaceTask.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (task.status !== "open") return res.status(400).json({ error: "This task is no longer open" });
    if (task.posterId === applicantId) return res.status(400).json({ error: "You cannot apply to your own task" });

    const existing = await prisma.taskApplication.findUnique({
      where: { taskId_applicantId: { taskId, applicantId } },
    });
    if (existing) return res.status(409).json({ error: "You already applied to this task" });

    const app = await prisma.taskApplication.create({
      data: { taskId, applicantId, proposedGP: parseInt(proposedGP) || task.budgetGP },
    });
    return res.status(201).json(app);
  } catch (error) {
    return res.status(500).json({ error: "Application failed" });
  }
});

router.post("/applications/:appId/accept", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { appId } = req.params;

    const app = await prisma.taskApplication.findUnique({
      where: { id: appId },
      include: { task: true },
    });
    if (!app) return res.status(404).json({ error: "Application not found" });
    if (app.task.posterId !== userId) return res.status(403).json({ error: "Forbidden" });
    if (app.task.status !== "open") return res.status(400).json({ error: "Task is no longer open" });

    // Accepting locks in the negotiated rate as the task budget.
    await prisma.taskApplication.update({ where: { id: appId }, data: { status: "accepted" } });
    await prisma.taskApplication.updateMany({
      where: { taskId: app.taskId, id: { not: appId } },
      data: { status: "rejected" },
    });
    await prisma.marketplaceTask.update({
      where: { id: app.taskId },
      data: { status: "in-progress", assignedWorkerId: app.applicantId, budgetGP: app.proposedGP },
    });

    return res.json({ message: "Application accepted" });
  } catch (error) {
    return res.status(500).json({ error: "Acceptance failed" });
  }
});

// ----------------------------------------------------------------------------
// COMPLETION + REVIEWS
// ----------------------------------------------------------------------------

router.post("/tasks/:taskId/complete", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { taskId } = req.params;
    const { rating, comment } = req.body;

    const task = await prisma.marketplaceTask.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (task.posterId !== userId) return res.status(403).json({ error: "Forbidden" });
    if (task.status !== "in-progress") return res.status(400).json({ error: "Task must be in-progress" });
    if (!task.assignedWorkerId) return res.status(400).json({ error: "Task has no assigned worker" });

    const poster = await prisma.user.findUnique({ where: { id: userId }, select: { greenPoints: true } });
    if (!poster || poster.greenPoints < task.budgetGP) {
      return res.status(400).json({ error: "You no longer have enough Green Points to pay this worker" });
    }

    await prisma.marketplaceTask.update({ where: { id: taskId }, data: { status: "completed" } });

    // GP transfer (exact, zero-sum) + worker XP (honors MAX multiplier).
    await prisma.user.update({
      where: { id: userId },
      data: { greenPoints: { decrement: task.budgetGP } },
    });
    await prisma.user.update({
      where: { id: task.assignedWorkerId },
      data: { greenPoints: { increment: task.budgetGP } },
    });
    await grantRewards(task.assignedWorkerId, { xp: 50 });

    // Optional review submitted alongside completion.
    if (rating !== undefined && rating !== null) {
      const stars = parseInt(rating);
      if (stars >= 1 && stars <= 5) {
        await prisma.review.create({
          data: {
            taskId,
            reviewerId: userId,
            revieweeId: task.assignedWorkerId,
            rating: stars,
            comment: comment || null,
          },
        });
        await recomputeAverageRating(task.assignedWorkerId);

        const fiveStarCount = await prisma.review.count({
          where: { revieweeId: task.assignedWorkerId, rating: 5 },
        });
        if (fiveStarCount >= 10) await unlockAchievement(task.assignedWorkerId, "trusted-worker");
      }
    }

    return res.json({ message: "Task completed", gpTransferred: task.budgetGP });
  } catch (error) {
    console.error("Completion error:", error);
    return res.status(500).json({ error: "Completion failed" });
  }
});

// Leave a review separately (e.g. if skipped at completion). Editable within 48h.
router.post("/tasks/:taskId/review", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { taskId } = req.params;
    const { rating, comment } = req.body;

    const stars = parseInt(rating);
    if (!(stars >= 1 && stars <= 5)) return res.status(400).json({ error: "Rating must be 1-5" });

    const task = await prisma.marketplaceTask.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (task.posterId !== userId) return res.status(403).json({ error: "Only the task poster can review" });
    if (task.status !== "completed") return res.status(400).json({ error: "Task must be completed first" });
    if (!task.assignedWorkerId) return res.status(400).json({ error: "No worker to review" });

    const existing = await prisma.review.findFirst({ where: { taskId, reviewerId: userId } });
    if (existing) {
      const ageMs = Date.now() - new Date(existing.createdAt).getTime();
      if (ageMs > 48 * 60 * 60 * 1000) {
        return res.status(403).json({ error: "Reviews can't be edited after 48 hours" });
      }
      await prisma.review.update({ where: { id: existing.id }, data: { rating: stars, comment: comment || null } });
    } else {
      await prisma.review.create({
        data: { taskId, reviewerId: userId, revieweeId: task.assignedWorkerId, rating: stars, comment: comment || null },
      });
    }
    await recomputeAverageRating(task.assignedWorkerId);
    return res.json({ message: "Review saved" });
  } catch (error) {
    return res.status(500).json({ error: "Review failed" });
  }
});

router.get("/reviews/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const reviews = await prisma.review.findMany({
      where: { revieweeId: userId },
      orderBy: { createdAt: "desc" },
      include: { reviewer: { select: { id: true, displayName: true, profileImage: true } } },
    });
    return res.json(reviews);
  } catch (error) {
    return res.status(500).json({ error: "Fetch reviews failed" });
  }
});

// ----------------------------------------------------------------------------
// WORKER DIRECTORY
// ----------------------------------------------------------------------------

router.get("/workers", async (_req: Request, res: Response) => {
  try {
    const workers = await prisma.user.findMany({
      where: { availableForHire: true, isBanned: false },
      select: {
        id: true,
        displayName: true,
        username: true,
        profileImage: true,
        bio: true,
        bioForHire: true,
        averageRating: true,
        level: true,
        subscription: { select: { type: true, status: true } },
        _count: { select: { reviewsReceived: true, assignedTasks: true } },
      },
    });
    // PRO/MAX subscribers are boosted to the top of the worker search.
    const ranked = workers
      .map((w) => ({
        ...w,
        boosted: w.subscription?.status === "active" && (w.subscription.type === "pro" || w.subscription.type === "max"),
        reviewCount: w._count.reviewsReceived,
        completedTasks: w._count.assignedTasks,
      }))
      .sort((a, b) => {
        if (a.boosted !== b.boosted) return Number(b.boosted) - Number(a.boosted);
        return (b.averageRating ?? 0) - (a.averageRating ?? 0);
      });
    return res.json(ranked);
  } catch (error) {
    return res.status(500).json({ error: "Fetch workers failed" });
  }
});

export default router;
