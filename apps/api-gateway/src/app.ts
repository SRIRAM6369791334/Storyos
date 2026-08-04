import express, { type Express } from "express";
import { CharacterController } from "./character/character.controller.js";
import { EventController } from "./event/event.controller.js";
import { HealthController } from "./health/health.controller.js";
import { LocationController } from "./location/location.controller.js";
import { RelationshipController } from "./relationship/relationship.controller.js";
import { UniverseController } from "./universe/universe.controller.js";

export function createApp(): {
  app: Express;
  healthController: HealthController;
  universeController: UniverseController;
  characterController: CharacterController;
  locationController: LocationController;
  relationshipController: RelationshipController;
  eventController: EventController;
} {
  const app = express();
  const healthController = new HealthController();
  const universeController = new UniverseController();
  const characterController = new CharacterController();
  const locationController = new LocationController();
  const relationshipController = new RelationshipController();
  const eventController = new EventController();

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

  // World Building - Location Endpoints (Sprint 3 Vertical Slice)
  app.post("/universes/:universeId/locations", locationController.createLocation);
  app.get("/locations/:id", locationController.getLocationById);
  app.get("/universes/:universeId/locations", locationController.listLocationsByUniverse);
  app.get("/locations/:id/children", locationController.listChildLocations);

  // Relationship Endpoints (Sprint 4 Vertical Slice - Neo4j Graph Backed)
  app.post("/universes/:universeId/relationships", relationshipController.createRelationship);
  app.get("/relationships/:id", relationshipController.getRelationshipById);
  app.get(
    "/characters/:characterId/relationships",
    relationshipController.listRelationshipsByCharacter,
  );

  // Timeline Event Endpoints (Sprint 5 Vertical Slice)
  app.post("/universes/:universeId/events", eventController.createEvent);
  app.get("/events/:id", eventController.getEventById);
  app.get("/universes/:universeId/events", eventController.listEventsByUniverse);
  app.get("/characters/:characterId/events", eventController.listEventsByCharacter);

  return {
    app,
    healthController,
    universeController,
    characterController,
    locationController,
    relationshipController,
    eventController,
  };
}
