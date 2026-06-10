import app from "./app";
import { logger } from "./lib/logger";
import { initVapid } from "./lib/webpush";
import { initChatServer } from "./lib/chat";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Initialize Web Push VAPID keys
initVapid();

// Start HTTP server
const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

// Attach WebSocket chat server to the same HTTP server
initChatServer(server);
