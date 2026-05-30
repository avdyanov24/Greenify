import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { getHexBoundary } from "../utils/hex";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const hexes = await prisma.hex.findMany({
      include: {
        user: { select: { id: true, username: true, displayName: true } },
        organization: { select: { id: true, name: true } },
      },
    });

    const features = hexes.map((hex) => {
      const boundary = getHexBoundary(hex.h3Index);
      // H3 boundary returns [lat, lng] pairs; GeoJSON needs [lng, lat]
      const coordinates = [boundary.map(([lat, lng]) => [lng, lat])];

      return {
        type: "Feature",
        geometry: { type: "Polygon", coordinates },
        properties: {
          h3Index: hex.h3Index,
          plantCount: hex.plantCount,
          userId: hex.userId,
          userName: hex.user?.displayName || hex.user?.username,
          organizationId: hex.organizationId,
          organizationName: hex.organization?.name,
        },
      };
    });

    return res.json({
      type: "FeatureCollection",
      features,
      hexes: hexes.map((h) => ({
        h3Index: h.h3Index,
        plantCount: h.plantCount,
        userId: h.userId,
        organizationId: h.organizationId,
      })),
    });
  } catch (error) {
    console.error("Map error:", error);
    return res.status(500).json({ error: "Map data fetch failed" });
  }
});

router.get("/hex/:h3Index", async (req: Request, res: Response) => {
  try {
    const { h3Index } = req.params;

    const hex = await prisma.hex.findUnique({
      where: { h3Index },
      include: {
        user: { select: { id: true, username: true, displayName: true } },
        organization: { select: { id: true, name: true } },
        posts: {
          where: { status: "approved" },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            user: { select: { id: true, displayName: true } },
            images: { orderBy: { order: "asc" }, take: 1 },
          },
        },
      },
    });

    if (!hex) {
      return res.json({ h3Index, plantCount: 0, userId: null, posts: [] });
    }

    return res.json(hex);
  } catch (error) {
    return res.status(500).json({ error: "Hex details fetch failed" });
  }
});

router.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const hexes = await prisma.hex.findMany({
      where: { userId },
      select: { h3Index: true, plantCount: true },
    });
    return res.json(hexes);
  } catch (error) {
    return res.status(500).json({ error: "User hexes fetch failed" });
  }
});

router.get("/organization/:orgId", async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const hexes = await prisma.hex.findMany({
      where: { organizationId: orgId },
      select: { h3Index: true, plantCount: true },
    });
    return res.json(hexes);
  } catch (error) {
    return res.status(500).json({ error: "Organization hexes fetch failed" });
  }
});

export default router;
