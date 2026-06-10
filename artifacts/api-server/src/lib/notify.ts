import { sendPushNotification } from "./webpush";

/**
 * Central notification dispatcher.
 * Persists to DB and sends a Web Push notification if the user has subscribed.
 */
export async function sendNotification(
  userId: number,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  await sendPushNotification(userId, title, body, data);
}
