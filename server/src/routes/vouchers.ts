import { Router, Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import { prisma } from "../db";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const vouchers = await prisma.voucher.findMany({
      where: { status: "active" },
      orderBy: { gpValue: "asc" },
    });
    return res.json(vouchers);
  } catch (error) {
    return res.status(500).json({ error: "Fetch vouchers failed" });
  }
});

router.post("/redeem", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { voucherId } = req.body;

    const voucher = await prisma.voucher.findUnique({ where: { id: voucherId } });
    if (!voucher || voucher.status !== "active") {
      return res.status(404).json({ error: "Voucher not found or inactive" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { greenPoints: true } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.greenPoints < voucher.gpValue) {
      return res.status(400).json({ error: "Insufficient Green Points" });
    }

    const userVoucher = await prisma.userVoucher.create({
      data: { userId, voucherId, status: "unused" },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { greenPoints: { decrement: voucher.gpValue } },
    });

    return res.json(userVoucher);
  } catch (error) {
    return res.status(500).json({ error: "Voucher redemption failed" });
  }
});

router.get("/my-vouchers", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const vouchers = await prisma.userVoucher.findMany({
      where: { userId },
      include: { voucher: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json(vouchers);
  } catch (error) {
    return res.status(500).json({ error: "Fetch my vouchers failed" });
  }
});

export default router;
