import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import jwt from "jsonwebtoken";
import { db, messagesTable, usersTable, bookingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";

interface ChatClient {
  ws: WebSocket;
  userId: number;
  bookingId: number;
}

// Map of bookingId -> set of connected clients
const rooms = new Map<number, Set<ChatClient>>();

function getOrCreateRoom(bookingId: number): Set<ChatClient> {
  if (!rooms.has(bookingId)) rooms.set(bookingId, new Set());
  return rooms.get(bookingId)!;
}

export function initChatServer(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket, head) => {
    const url = new URL(req.url ?? "", `http://${req.headers.host}`);

    // Only handle /api/chat/:bookingId
    const match = url.pathname.match(/^\/api\/chat\/(\d+)$/);
    if (!match) {
      socket.destroy();
      return;
    }

    const bookingId = parseInt(match[1]);
    const token = url.searchParams.get("token");
    const JWT_SECRET = process.env.SESSION_SECRET || "fallback_secret";

    let userId: number;
    try {
      const decoded = jwt.verify(token ?? "", JWT_SECRET) as { id: number };
      userId = decoded.id;
    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, async (ws) => {
      // Verify the user is part of this booking
      const [booking] = await db.select().from(bookingsTable)
        .where(eq(bookingsTable.id, bookingId)).limit(1);

      if (!booking || (booking.clientId !== userId && booking.providerId !== userId)) {
        ws.close(1008, "Not authorized for this booking");
        return;
      }

      const client: ChatClient = { ws, userId, bookingId };
      const room = getOrCreateRoom(bookingId);
      room.add(client);

      logger.info({ userId, bookingId }, "Chat client connected");

      // Send last 50 messages on connect
      const history = await db.select().from(messagesTable)
        .where(eq(messagesTable.bookingId, bookingId))
        .orderBy(messagesTable.createdAt)
        .limit(50);

      ws.send(JSON.stringify({ type: "history", messages: history }));

      ws.on("message", async (raw) => {
        try {
          const { content } = JSON.parse(raw.toString()) as { content: string };
          if (!content?.trim()) return;

          const [msg] = await db.insert(messagesTable).values({
            bookingId,
            senderId: userId,
            content: content.trim(),
          }).returning();

          // Broadcast to all clients in the room
          const outbound = JSON.stringify({ type: "message", message: msg });
          for (const c of room) {
            if (c.ws.readyState === WebSocket.OPEN) {
              c.ws.send(outbound);
            }
          }
        } catch (err) {
          logger.warn({ err }, "Chat message error");
        }
      });

      ws.on("close", () => {
        room.delete(client);
        if (room.size === 0) rooms.delete(bookingId);
        logger.info({ userId, bookingId }, "Chat client disconnected");
      });
    });
  });

  logger.info("WebSocket chat server initialized");
}
