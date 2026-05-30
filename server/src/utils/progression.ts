import { prisma } from "../db";

/**
 * XP thresholds for each level. Index = level - 1.
 * Level 1: 0-99, Level 2: 100-299, Level 3: 300-599, Level 4: 600-999, Level 5: 1000+
 */
export const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000];

export function computeLevel(xp: number): number {
  if (xp >= 1000) return 5;
  if (xp >= 600) return 4;
  if (xp >= 300) return 3;
  if (xp >= 100) return 2;
  return 1;
}

/** Multiplier applied to earned XP/GP for a MAX subscriber. */
export const MAX_MULTIPLIER = 1.5;

export interface RewardResult {
  xpGain: number;
  gpGain: number;
  newXp: number;
  newLevel: number;
  leveledUp: boolean;
  multiplier: number;
}

/**
 * Grant XP and/or Green Points to a user, honoring the MAX subscription 1.5x
 * multiplier. Recomputes level and reports whether the user leveled up.
 */
export async function grantRewards(
  userId: string,
  base: { xp?: number; gp?: number },
): Promise<RewardResult | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      xp: true,
      level: true,
      greenPoints: true,
      subscription: { select: { type: true, status: true } },
    },
  });
  if (!user) return null;

  const isMax = user.subscription?.type === "max" && user.subscription?.status === "active";
  const multiplier = isMax ? MAX_MULTIPLIER : 1;
  const xpGain = Math.round((base.xp ?? 0) * multiplier);
  const gpGain = Math.round((base.gp ?? 0) * multiplier);

  const newXp = user.xp + xpGain;
  const newLevel = computeLevel(newXp);
  const leveledUp = newLevel > user.level;

  await prisma.user.update({
    where: { id: userId },
    data: { xp: newXp, level: newLevel, greenPoints: { increment: gpGain } },
  });

  return { xpGain, gpGain, newXp, newLevel, leveledUp, multiplier };
}

/**
 * Unlock an achievement for a user (idempotent). Grants bonus XP on first unlock.
 * Returns true if newly unlocked.
 */
export async function unlockAchievement(userId: string, slug: string): Promise<boolean> {
  const achievement = await prisma.achievement.findUnique({ where: { slug } });
  if (!achievement) return false;

  const existing = await prisma.userAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId: achievement.id } },
  });
  if (existing) return false;

  await prisma.userAchievement.create({
    data: { userId, achievementId: achievement.id },
  });
  await grantRewards(userId, { xp: 50 });
  return true;
}

/** Recompute and persist a user's average rating from their received reviews. */
export async function recomputeAverageRating(userId: string): Promise<number | null> {
  const agg = await prisma.review.aggregate({
    where: { revieweeId: userId },
    _avg: { rating: true },
  });
  const avg = agg._avg.rating ?? null;
  await prisma.user.update({
    where: { id: userId },
    data: { averageRating: avg },
  });
  return avg;
}
