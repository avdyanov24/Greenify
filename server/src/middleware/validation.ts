import { Request, Response, NextFunction } from "express";
import { prisma } from "../db";

export const rateLimitPostCreation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId;
    if (!userId) return next();

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await prisma.post.count({
      where: { userId, createdAt: { gte: since } },
    });

    if (count >= 3) {
      return res.status(429).json({ error: "Max 3 planting posts per day" });
    }
    return next();
  } catch (err) {
    return next(err);
  }
};

export const validateBurgasLocation = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { latitude, longitude } = req.body;

  if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
    return res.status(400).json({ error: "GPS coordinates required" });
  }

  const lat = parseFloat(String(latitude));
  const lng = parseFloat(String(longitude));

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: "Invalid GPS coordinates" });
  }

  // Burgas bounds — relaxed slightly for demo
  if (lat < 42.3 || lat > 42.9 || lng < 27.2 || lng > 27.7) {
    console.warn(`Location outside Burgas bounds: ${lat}, ${lng} — allowing for dev`);
  }

  return next();
};

export const requireLevel = (minLevel: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { level: true },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.level < minLevel) {
        return res.status(403).json({
          error: `Level ${minLevel} required to post. You are Level ${user.level}.`,
          requiredLevel: minLevel,
          currentLevel: user.level,
        });
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
};
