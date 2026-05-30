import { Router, Request, Response } from "express";
import { authenticateToken, generateToken } from "../middleware/auth";
import { prisma } from "../db";
import bcryptjs from "bcryptjs";

const router = Router();

function computeLevel(xp: number): number {
  if (xp >= 1000) return 5;
  if (xp >= 600) return 4;
  if (xp >= 300) return 3;
  if (xp >= 100) return 2;
  return 1;
}

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, username, displayName } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: "Email, password, and username are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const passwordHash = await bcryptjs.hash(password, 10);

    // New users get 300 XP (Level 3) so they can create posts immediately in the demo
    const startingXp = 300;
    const startingLevel = computeLevel(startingXp);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        username,
        displayName: displayName || username,
        xp: startingXp,
        level: startingLevel,
      },
    });

    const token = generateToken(user.id);

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        level: user.level,
        xp: user.xp,
        greenPoints: user.greenPoints,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcryptjs.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user.id);

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        level: user.level,
        xp: user.xp,
        greenPoints: user.greenPoints,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed" });
  }
});

router.post("/logout", authenticateToken, (_req: Request, res: Response) => {
  res.json({ message: "Logged out successfully" });
});

router.post("/refresh", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const token = generateToken(user.id);
    return res.json({ token });
  } catch {
    return res.status(500).json({ error: "Token refresh failed" });
  }
});

export default router;
