import { Router, Response } from "express";
import { db, bookingsTable, usersTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import { protect, AuthRequest } from "../middlewares/auth";
import { sendNotification } from "../lib/notify";

const router = Router();

// GET /api/bookings — list bookings for the current user
router.get("/", protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    let rows;

    if (user.role === "admin") {
      rows = await db.select().from(bookingsTable).orderBy(bookingsTable.createdAt);
    } else if (user.role === "provider") {
      rows = await db.select().from(bookingsTable)
        .where(eq(bookingsTable.providerId, user.id))
        .orderBy(bookingsTable.createdAt);
    } else {
      rows = await db.select().from(bookingsTable)
        .where(eq(bookingsTable.clientId, user.id))
        .orderBy(bookingsTable.createdAt);
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// POST /api/bookings — create a booking (clients only)
router.post("/", protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (user.role !== "client" && user.role !== "admin") {
      res.status(403).json({ message: "Only clients can create bookings" });
      return;
    }

    const { providerId, serviceType, scheduledAt, lat, lng, region, notes } = req.body;

    if (!providerId || !serviceType) {
      res.status(400).json({ message: "providerId and serviceType are required" });
      return;
    }

    const [provider] = await db.select().from(usersTable)
      .where(and(eq(usersTable.id, providerId), eq(usersTable.role, "provider")))
      .limit(1);

    if (!provider) {
      res.status(404).json({ message: "Provider not found" });
      return;
    }

    const [booking] = await db.insert(bookingsTable).values({
      clientId: user.id,
      providerId,
      serviceType,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      lat,
      lng,
      region,
      notes,
    }).returning();

    // Notify the provider
    await sendNotification(
      provider.id,
      "New Booking Request",
      `${user.name} has requested a ${serviceType} service`,
      { bookingId: String(booking.id), type: "new_booking" }
    );

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// GET /api/bookings/:id
router.get("/:id", protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const bookingId = parseInt(req.params.id);
    const [booking] = await db.select().from(bookingsTable)
      .where(eq(bookingsTable.id, bookingId)).limit(1);

    if (!booking) { res.status(404).json({ message: "Booking not found" }); return; }

    const canAccess =
      user.role === "admin" ||
      booking.clientId === user.id ||
      booking.providerId === user.id;

    if (!canAccess) { res.status(403).json({ message: "Access denied" }); return; }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// PATCH /api/bookings/:id/status
router.patch("/:id/status", protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const bookingId = parseInt(req.params.id);
    const { status } = req.body as { status: string };

    const [booking] = await db.select().from(bookingsTable)
      .where(eq(bookingsTable.id, bookingId)).limit(1);

    if (!booking) { res.status(404).json({ message: "Booking not found" }); return; }

    // Permission: provider can accept/start/complete, client can cancel, admin can do anything
    const providerStatuses = ["accepted", "in_progress", "completed"];
    const clientStatuses = ["cancelled"];

    if (user.role === "provider" && booking.providerId !== user.id) {
      res.status(403).json({ message: "Access denied" }); return;
    }
    if (user.role === "client" && booking.clientId !== user.id) {
      res.status(403).json({ message: "Access denied" }); return;
    }
    if (user.role === "provider" && !providerStatuses.includes(status)) {
      res.status(403).json({ message: "Providers can only set: accepted, in_progress, completed" }); return;
    }
    if (user.role === "client" && !clientStatuses.includes(status)) {
      res.status(403).json({ message: "Clients can only cancel bookings" }); return;
    }

    const [updated] = await db.update(bookingsTable)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(bookingsTable.id, bookingId))
      .returning();

    // Notify the other party
    const notifyId = user.id === booking.clientId ? booking.providerId : booking.clientId;
    await sendNotification(
      notifyId,
      "Booking Status Update",
      `Your booking #${bookingId} is now: ${status}`,
      { bookingId: String(bookingId), status, type: "booking_update" }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

export default router;
