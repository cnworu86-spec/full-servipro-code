import webpush from "web-push";
import { db, pushSubscriptionsTable, notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

// Generate VAPID keys once and store in env:
//   node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(JSON.stringify(k));"
// Then set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in environment secrets.

let vapidConfigured = false;

export function initVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL || "mailto:admin@servipro.com";

  if (publicKey && privateKey) {
    webpush.setVapidDetails(email, publicKey, privateKey);
    vapidConfigured = true;
    logger.info("Web Push (VAPID) configured");
  } else {
    logger.warn("VAPID keys not set — push notifications disabled. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.");
  }
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

/**
 * Send a Web Push notification to all subscriptions for a user.
 * Also persists the notification to the DB.
 */
export async function sendPushNotification(
  userId: number,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  // Persist to DB
  await db.insert(notificationsTable).values({
    userId,
    title,
    body,
    data: data ? JSON.stringify(data) : undefined,
  });

  if (!vapidConfigured) {
    logger.debug({ userId, title }, "Push skipped — VAPID not configured");
    return;
  }

  const subs = await db.select().from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.userId, userId));

  const payload = JSON.stringify({ title, body, data });

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err: any) {
        // Remove expired/invalid subscriptions (410 Gone)
        if (err.statusCode === 410) {
          await db.delete(pushSubscriptionsTable)
            .where(eq(pushSubscriptionsTable.id, sub.id));
        }
        logger.warn({ userId, err: err.message }, "Push send failed");
      }
    })
  );
}
