import dotenv from "dotenv";
import { createApp } from "./app.js";

dotenv.config();

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
