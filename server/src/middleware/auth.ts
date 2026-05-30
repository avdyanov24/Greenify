import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../db";

// TODO: Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Middleware to verify JWT token from Authorization header
 * Extracts userId and attaches to req.userId
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    jwt.verify(token, process.env.JWT_SECRET || "", (err, decoded: any) => {
      if (err) {
        return res.status(403).json({ error: "Invalid token" });
      }
      req.userId = decoded.userId;
      next();
    });
  } catch (error) {
    res.status(403).json({ error: "Token verification failed" });
  }
};

/**
 * Like authenticateToken but never rejects: if a valid token is present it sets
 * req.userId, otherwise it just continues. Useful for public endpoints that
 * personalize their response (e.g. isFollowing) when the caller is signed in.
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return next();
  jwt.verify(token, process.env.JWT_SECRET || "", (err, decoded: any) => {
    if (!err && decoded?.userId) req.userId = decoded.userId;
    next();
  });
};

/**
 * Middleware factory: require the authenticated user to have one of the given
 * roles (e.g. "moderator", "admin"). Must run after `authenticateToken`.
 */
export const requireRole = (...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (!user) return res.status(404).json({ error: "User not found" });

      if (!roles.includes(user.role)) {
        return res.status(403).json({ error: "You don't have permission to do that" });
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
};

/**
 * Create a JWT token with userId
 */
export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || "", {
    expiresIn: "7d",
  });
};
