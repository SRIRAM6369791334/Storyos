import express, { type Express } from "express";
import { HealthController } from "./health/health.controller.js";
import { UniverseController } from "./universe/universe.controller.js";

export function createApp(): {
  app: Express;
  healthController: HealthController;
  universeController: UniverseController;
} {
  const app = express();
  const healthController = new HealthController();
  const universeController = new UniverseController();

  app.use(express.json());

  // Liveness & Readiness Probes (REL-001)
  app.get("/health", healthController.getLiveness);
  app.get("/health/deep", healthController.getReadiness);

  // Story Universe Endpoints (Sprint 1 Vertical Slice)
  app.post("/universes", universeController.createUniverse);
  app.get("/universes/:id", universeController.getUniverseById);

  return { app, healthController, universeController };
}
