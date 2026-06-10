import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { protect, signToken, AuthRequest } from "../middlewares/auth";
import { Response } from "express";

const router = Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body as {
      name: string;
      email: string;
      password: string;
      role?: string;
    };

    if (!name || !email || !password) {
      res.status(400).json({ message: "name, email, and password are required" });
      return;
    }

    const safeRole = ["client", "provider"].includes(role ?? "") ? (role as "client" | "provider") : "client";

    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (existing) {
      res.status(400).json({ message: "Email already in use" });
      return;
    }

    const hashed = await bcrypt.hash(password, 12);
    const [user] = await db.insert(usersTable).values({
      name,
      email: email.toLowerCase(),
      password: hashed,
      role: safeRole,
    }).returning();

    const token = signToken(user.id);
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status },
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      res.status(400).json({ message: "email and password are required" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    if (user.status === "suspended") {
      res.status(403).json({ message: "Your account has been suspended" });
      return;
    }

    const token = signToken(user.id);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status },
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// GET /api/auth/me — protected
router.get("/me", protect, (req: AuthRequest, res: Response) => {
  const u = req.user!;
  res.json({ user: { id: u.id, name: u.name, email: u.email, role: u.role, status: u.status } });
});

export default router;
