import { Router, Response } from "express";
import { db, pushSubscriptionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { protect, AuthRequest } from "../middlewares/auth";
import { getVapidPublicKey } from "../lib/webpush";

const router = Router();

// GET /api/push/vapid-public-key — client fetches this to subscribe
router.get("/vapid-public-key", (_req, res) => {
  const key = getVapidPublicKey();
  if (!key) {
    res.status(503).json({ message: "Push notifications not configured on this server" });
    return;
  }
  res.json({ publicKey: key });
});

// POST /api/push/subscribe — register a device for push notifications
router.post("/subscribe", protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { endpoint, keys } = req.body as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ message: "endpoint and keys (p256dh, auth) are required" });
      return;
    }

    // Upsert subscription
    await db.insert(pushSubscriptionsTable)
      .values({ userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth })
      .onConflictDoUpdate({
        target: pushSubscriptionsTable.endpoint,
        set: { p256dh: keys.p256dh, auth: keys.auth, userId: user.id },
      });

    res.status(201).json({ message: "Subscribed to push notifications" });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// DELETE /api/push/subscribe — unsubscribe
router.delete("/subscribe", protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { endpoint } = req.body as { endpoint: string };

    await db.delete(pushSubscriptionsTable)
      .where(and(
        eq(pushSubscriptionsTable.userId, user.id),
        eq(pushSubscriptionsTable.endpoint, endpoint)
      ));

    res.json({ message: "Unsubscribed" });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

export default router;
