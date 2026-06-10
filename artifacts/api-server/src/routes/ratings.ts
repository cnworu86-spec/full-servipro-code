import { Router, Response } from "express";
import { db, ratingsTable, bookingsTable } from "@workspace/db";
import { eq, avg, count } from "drizzle-orm";
import { protect, AuthRequest } from "../middlewares/auth";

const router = Router();

// GET /api/ratings — admin: list all ratings
router.get("/", protect, async (req: AuthRequest, res: Response) => {
  try {
    const ratings = await db.select().from(ratingsTable).orderBy(ratingsTable.createdAt);
    res.json(ratings);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// POST /api/ratings — submit a rating after a completed booking
router.post("/", protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { bookingId, ratedId, score, comment } = req.body as {
      bookingId: number;
      ratedId: number;
      score: number;
      comment?: string;
    };

    if (!bookingId || !ratedId || !score) {
      res.status(400).json({ message: "bookingId, ratedId and score are required" });
      return;
    }

    if (score < 1 || score > 5) {
      res.status(400).json({ message: "Score must be between 1 and 5" });
      return;
    }

    // Verify the booking exists and is completed
    const [booking] = await db.select().from(bookingsTable)
      .where(eq(bookingsTable.id, bookingId)).limit(1);

    if (!booking) { res.status(404).json({ message: "Booking not found" }); return; }
    if (booking.status !== "completed") {
      res.status(400).json({ message: "Can only rate completed bookings" }); return;
    }

    // Rater must be part of the booking
    if (booking.clientId !== user.id && booking.providerId !== user.id) {
      res.status(403).json({ message: "You are not part of this booking" }); return;
    }

    // Check for duplicate rating
    const [existing] = await db.select().from(ratingsTable)
      .where(eq(ratingsTable.bookingId, bookingId))
      .limit(1);

    if (existing) {
      res.status(400).json({ message: "You have already rated this booking" }); return;
    }

    const [rating] = await db.insert(ratingsTable).values({
      bookingId,
      raterId: user.id,
      ratedId,
      score,
      comment,
    }).returning();

    res.status(201).json(rating);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// GET /api/ratings/user/:id — get ratings summary for a user
router.get("/user/:id", protect, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    const ratings = await db.select().from(ratingsTable)
      .where(eq(ratingsTable.ratedId, userId))
      .orderBy(ratingsTable.createdAt);

    const totalRatings = ratings.length;
    const averageScore = totalRatings > 0
      ? ratings.reduce((sum, r) => sum + r.score, 0) / totalRatings
      : 0;

    res.json({
      userId,
      averageScore: Math.round(averageScore * 10) / 10,
      totalRatings,
      ratings,
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

export default router;
