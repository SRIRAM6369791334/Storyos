import { KafkaClient } from "@storyos/infrastructure-kafka";
import dotenv from "dotenv";
import { WorkerService } from "./worker/worker.service.js";

dotenv.config();

const kafkaClient = new KafkaClient();
const workerService = new WorkerService(kafkaClient);

const start = async (): Promise<void> => {
  try {
    await workerService.start();
    console.log("[StoryOS Worker Service] Started. Listening for messages on Kafka.");
  } catch (err) {
    console.error("[StoryOS Worker Service] Failed to start.", err);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal: string): Promise<void> => {
  console.log(`[StoryOS Worker Service] Received ${signal}, shutting down gracefully...`);
  await workerService.close();
  console.log("[StoryOS Worker Service] Shutdown complete.");
  process.exit(0);
};

process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => void gracefulShutdown("SIGINT"));

void start();
