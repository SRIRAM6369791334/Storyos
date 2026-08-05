import dotenv from "dotenv";
import { createApp } from "./app.js";

dotenv.config();

// Handle unhandled rejections from infrastructure clients (e.g., Milvus gRPC
// background connection retries) without crashing the process. The gateway
// remains operational for all domains that don't require the unavailable infra.
process.on("unhandledRejection", (reason: unknown) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  // gRPC connection failures from Milvus when infra is not running in dev mode
  if (msg.includes("No connection established") || msg.includes("UNAVAILABLE")) {
    console.warn("[StoryOS API Gateway] Infrastructure connection warning (non-fatal):", msg);
    return;
  }
  // Re-throw anything else as a fatal error
  console.error("[StoryOS API Gateway] Unhandled rejection:", reason);
  process.exit(1);
});

const PORT = Number(process.env.PORT || 3000);
const { app, healthController } = createApp();

const server = app.listen(PORT, () => {
  console.log(`[StoryOS API Gateway] Listening on http://localhost:${PORT}`);
  console.log(`[StoryOS Health Check] Liveness: http://localhost:${PORT}/health`);
  console.log(`[StoryOS Health Check] Readiness: http://localhost:${PORT}/health/deep`);
});

const gracefulShutdown = async (signal: string) => {
  console.log(`[StoryOS API Gateway] Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    await healthController.close();
    console.log("[StoryOS API Gateway] Shutdown complete.");
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
