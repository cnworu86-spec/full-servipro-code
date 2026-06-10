import { Router, Response } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { protect, AuthRequest } from "../middlewares/auth";

const router = Router();

// GET /api/notifications — current user's notifications
router.get("/", protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const notifs = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.userId, user.id))
      .orderBy(notificationsTable.createdAt);
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const notifId = parseInt(req.params.id);

    const [updated] = await db.update(notificationsTable)
      .set({ read: true })
      .where(and(
        eq(notificationsTable.id, notifId),
        eq(notificationsTable.userId, user.id)
      ))
      .returning();

    if (!updated) { res.status(404).json({ message: "Notification not found" }); return; }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

export default router;
