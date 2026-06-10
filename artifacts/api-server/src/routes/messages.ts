import { Router, Response } from "express";
import { db, messagesTable, bookingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { protect, AuthRequest } from "../middlewares/auth";

const router = Router();

// GET /api/messages/:bookingId — fetch chat history for a booking (REST fallback)
router.get("/:bookingId", protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const bookingId = parseInt(req.params.bookingId);

    // Verify access
    const [booking] = await db.select().from(bookingsTable)
      .where(eq(bookingsTable.id, bookingId)).limit(1);

    if (!booking) { res.status(404).json({ message: "Booking not found" }); return; }

    const canAccess =
      user.role === "admin" ||
      booking.clientId === user.id ||
      booking.providerId === user.id;

    if (!canAccess) { res.status(403).json({ message: "Access denied" }); return; }

    const messages = await db.select().from(messagesTable)
      .where(eq(messagesTable.bookingId, bookingId))
      .orderBy(messagesTable.createdAt)
      .limit(100);

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

export default router;
