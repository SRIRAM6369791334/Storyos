import express, { type Express } from "express";
import { CharacterController } from "./character/character.controller.js";
import { HealthController } from "./health/health.controller.js";
import { UniverseController } from "./universe/universe.controller.js";

export function createApp(): {
  app: Express;
  healthController: HealthController;
  universeController: UniverseController;
  characterController: CharacterController;
} {
  const app = express();
  const healthController = new HealthController();
  const universeController = new UniverseController();
  const characterController = new CharacterController();

  app.use(express.json());

  // Liveness & Readiness Probes (REL-001)
  app.get("/health", healthController.getLiveness);
  app.get("/health/deep", healthController.getReadiness);

  // Story Universe Endpoints (Sprint 1 Vertical Slice)
  app.post("/universes", universeController.createUniverse);
  app.get("/universes/:id", universeController.getUniverseById);

  // Character Endpoints (Sprint 2 Vertical Slice)
  app.post("/universes/:universeId/characters", characterController.createCharacter);
  app.get("/characters/:id", characterController.getCharacterById);
  app.get("/universes/:universeId/characters", characterController.listCharactersByUniverse);

  return { app, healthController, universeController, characterController };
}
