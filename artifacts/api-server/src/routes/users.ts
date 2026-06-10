import { Router, Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { protect, roleCheck, AuthRequest } from "../middlewares/auth";

const router = Router();

// GET /api/users?role=provider — admin only, optional role filter
router.get("/", protect, roleCheck("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.query as { role?: string };

    const query = db.select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      status: usersTable.status,
      category: usersTable.category,
      region: usersTable.region,
      isAvailable: usersTable.isAvailable,
      createdAt: usersTable.createdAt,
    }).from(usersTable);

    const users = role
      ? await query.where(sql`role = ${role}`).orderBy(usersTable.createdAt)
      : await query.orderBy(usersTable.createdAt);

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// PATCH /api/users/:id/status — admin only
router.patch("/:id/status", protect, roleCheck("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { status } = req.body as { status: "active" | "pending" | "suspended" };

    if (!["active", "pending", "suspended"].includes(status)) {
      res.status(400).json({ message: "Invalid status" });
      return;
    }

    const [updated] = await db
      .update(usersTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(usersTable.id, userId))
      .returning({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        status: usersTable.status,
        category: usersTable.category,
        region: usersTable.region,
      });

    if (!updated) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

export default router;
