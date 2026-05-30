import { Router, Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import { prisma } from "../db";

const router = Router();

// Pricing (EUR / month). Stripe checkout is deferred per MVP scope, so these
// subscribe endpoints activate the plan immediately ("mock checkout").
export const PLAN_PRICES: Record<string, number> = { pro: 4.99, max: 9.99 };

router.get("/me", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    return res.json({ subscription });
  } catch (error) {
    return res.status(500).json({ error: "Fetch subscription failed" });
  }
});

router.post("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { type } = req.body;

    if (type !== "pro" && type !== "max") {
      return res.status(400).json({ error: "type must be 'pro' or 'max'" });
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const subscription = await prisma.subscription.upsert({
      where: { userId },
      update: { type, status: "active", currentPeriodStart: now, currentPeriodEnd: periodEnd },
      create: {
        userId,
        type,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    return res.status(201).json({ subscription, priceEur: PLAN_PRICES[type] });
  } catch (error) {
    console.error("Subscribe error:", error);
    return res.status(500).json({ error: "Subscription failed" });
  }
});

router.post("/me/cancel", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const existing = await prisma.subscription.findUnique({ where: { userId } });
    if (!existing) return res.status(404).json({ error: "No active subscription" });

    await prisma.subscription.delete({ where: { userId } });
    return res.json({ message: "Subscription cancelled" });
  } catch (error) {
    return res.status(500).json({ error: "Cancellation failed" });
  }
});

router.post("/webhook", (_req: Request, res: Response) => {
  // Reserved for Stripe webhook integration (deferred to v2).
  res.json({ received: true });
});

export default router;
