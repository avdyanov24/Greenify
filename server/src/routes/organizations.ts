import { Router, Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import { requireLevel } from "../middleware/validation";
import { prisma } from "../db";
import { unlockAchievement } from "../utils/progression";

const router = Router();

const DISTRIBUTION_MODES = ["equal", "leader-cut", "contribution-weighted"];

router.get("/", async (_req: Request, res: Response) => {
  try {
    const orgs = await prisma.organization.findMany({
      include: {
        leader: { select: { id: true, displayName: true } },
        _count: { select: { members: true, hexes: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(
      orgs.map((o) => ({
        ...o,
        memberCount: o._count.members,
        hexCount: o._count.hexes,
      })),
    );
  } catch (error) {
    return res.status(500).json({ error: "Fetch organizations failed" });
  }
});

// Any Level 5+ user can create an organization.
router.post("/", authenticateToken, requireLevel(5), async (req: Request, res: Response) => {
  try {
    const leaderId = req.userId!;
    const { name, description, distributionMode, leaderCutPercent } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: "Organization name required" });

    const mode = DISTRIBUTION_MODES.includes(distributionMode) ? distributionMode : "equal";

    const org = await prisma.organization.create({
      data: {
        name: name.trim(),
        description: description || "",
        leaderId,
        distributionMode: mode,
        leaderCutPercent: mode === "leader-cut" ? Math.min(30, Math.max(10, parseInt(leaderCutPercent) || 20)) : null,
        members: { create: { userId: leaderId, role: "leader" } },
      },
    });

    // Merge the founder's hexes into the org territory.
    await prisma.hex.updateMany({ where: { userId: leaderId }, data: { organizationId: org.id } });

    await unlockAchievement(leaderId, "org-founder");

    return res.status(201).json(org);
  } catch (error) {
    console.error("Org creation error:", error);
    return res.status(500).json({ error: "Organization creation failed" });
  }
});

router.get("/:orgId", async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        leader: { select: { id: true, displayName: true, profileImage: true } },
        members: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                username: true,
                profileImage: true,
                level: true,
                _count: { select: { posts: true, endorsementsReceived: true } },
              },
            },
          },
        },
        hexes: { select: { plantCount: true } },
        _count: { select: { hexes: true } },
      },
    });
    if (!org) return res.status(404).json({ error: "Organization not found" });

    // Compute live contribution score per member (posts + endorsements received).
    const members = org.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      displayName: m.user.displayName,
      username: m.user.username,
      profileImage: m.user.profileImage,
      level: m.user.level,
      postCount: m.user._count.posts,
      contributionScore: m.user._count.posts * 3 + m.user._count.endorsementsReceived,
    }));
    members.sort((a, b) => b.contributionScore - a.contributionScore);

    const totalPlants = org.hexes.reduce((sum, h) => sum + h.plantCount, 0);

    return res.json({
      id: org.id,
      name: org.name,
      description: org.description,
      logo: org.logo,
      leader: org.leader,
      leaderId: org.leaderId,
      distributionMode: org.distributionMode,
      leaderCutPercent: org.leaderCutPercent,
      hexCount: org._count.hexes,
      totalPlants,
      members,
    });
  } catch (error) {
    console.error("Org fetch error:", error);
    return res.status(500).json({ error: "Organization fetch failed" });
  }
});

// Update org settings — leader only.
router.patch("/:orgId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { orgId } = req.params;
    const { name, description, distributionMode, leaderCutPercent } = req.body;

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return res.status(404).json({ error: "Organization not found" });
    if (org.leaderId !== userId) return res.status(403).json({ error: "Only the leader can edit settings" });

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (distributionMode !== undefined && DISTRIBUTION_MODES.includes(distributionMode)) {
      data.distributionMode = distributionMode;
      data.leaderCutPercent =
        distributionMode === "leader-cut"
          ? Math.min(30, Math.max(10, parseInt(leaderCutPercent) || 20))
          : null;
    }

    const updated = await prisma.organization.update({ where: { id: orgId }, data });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: "Update failed" });
  }
});

// Direct join (request/invite flow simplified for the MVP). Merges hexes.
router.post("/:orgId/join", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { orgId } = req.params;

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return res.status(404).json({ error: "Organization not found" });

    const existing = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (existing) return res.status(409).json({ error: "Already a member" });

    await prisma.organizationMember.create({
      data: { organizationId: orgId, userId, role: "member" },
    });
    // Merge member hexes into the org territory blob.
    await prisma.hex.updateMany({ where: { userId }, data: { organizationId: orgId } });

    return res.json({ message: "Joined organization" });
  } catch (error) {
    return res.status(500).json({ error: "Join failed" });
  }
});

router.post("/:orgId/leave", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { orgId } = req.params;

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return res.status(404).json({ error: "Organization not found" });
    if (org.leaderId === userId) return res.status(400).json({ error: "The leader cannot leave; delete the org instead" });

    await prisma.organizationMember.deleteMany({ where: { organizationId: orgId, userId } });
    // Return the member's hexes to personal ownership.
    await prisma.hex.updateMany({ where: { userId, organizationId: orgId }, data: { organizationId: null } });

    return res.json({ message: "Left organization" });
  } catch (error) {
    return res.status(500).json({ error: "Leave failed" });
  }
});

router.delete("/:orgId/members/:userId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const requesterId = req.userId!;
    const { orgId, userId } = req.params;

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return res.status(404).json({ error: "Organization not found" });
    if (org.leaderId !== requesterId) return res.status(403).json({ error: "Only the leader can remove members" });
    if (userId === org.leaderId) return res.status(400).json({ error: "Cannot remove the leader" });

    await prisma.organizationMember.deleteMany({ where: { organizationId: orgId, userId } });
    await prisma.hex.updateMany({ where: { userId, organizationId: orgId }, data: { organizationId: null } });

    return res.json({ message: "Member removed" });
  } catch (error) {
    return res.status(500).json({ error: "Member removal failed" });
  }
});

export default router;
