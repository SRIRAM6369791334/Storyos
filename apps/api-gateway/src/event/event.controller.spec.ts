import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventController } from "./event.controller.js";

describe("EventController", () => {
  let mockCreateHandler: any;
  let mockGetHandler: any;
  let mockListByUniverseHandler: any;
  let mockListByCharacterHandler: any;
  let controller: EventController;

  beforeEach(() => {
    mockCreateHandler = { execute: vi.fn() };
    mockGetHandler = { execute: vi.fn() };
    mockListByUniverseHandler = { execute: vi.fn() };
    mockListByCharacterHandler = { execute: vi.fn() };

    const mockPostgresClient = { close: vi.fn().mockResolvedValue(undefined) } as any;
    const mockKafkaClient = { close: vi.fn().mockResolvedValue(undefined) } as any;

    controller = new EventController(
      mockCreateHandler,
      mockGetHandler,
      mockListByUniverseHandler,
      mockListByCharacterHandler,
      mockPostgresClient,
      mockKafkaClient,
    );
  });

  afterEach(async () => {
    await controller.close();
  });

  describe("POST /universes/:universeId/events", () => {
    it("returns 201 Created when event creation succeeds", async () => {
      const req = {
        params: { universeId: "uni_100" },
        body: {
          eventId: "evt_100",
          title: "Battle of Camlann",
          description: "Final battle of King Arthur.",
          createdBy: "usr_100",
        },
      } as any;

      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockCreateHandler.execute.mockResolvedValue({
        eventId: "evt_100",
        universeId: "uni_100",
        title: "Battle of Camlann",
        description: "Final battle of King Arthur.",
        status: "CANON",
        participants: [],
        createdBy: "usr_100",
        createdAt: new Date().toISOString(),
      });

      await controller.createEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: "evt_100",
          title: "Battle of Camlann",
        }),
      );
    });
  });

  describe("GET /events/:id", () => {
    it("returns 200 OK with EventDTO when event exists", async () => {
      const req = { params: { id: "evt_200" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockGetHandler.execute.mockResolvedValue({
        eventId: "evt_200",
        universeId: "uni_100",
        title: "Coronation of Arthur",
        description: "Crown ceremony.",
        status: "CANON",
        participants: [],
        createdBy: "usr_100",
        createdAt: new Date().toISOString(),
      });

      await controller.getEventById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: "evt_200",
          title: "Coronation of Arthur",
        }),
      );
    });
  });

  describe("GET /characters/:characterId/events", () => {
    it("returns 200 OK with list of events character participated in", async () => {
      const req = { params: { characterId: "char_1" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockListByCharacterHandler.execute.mockResolvedValue([
        {
          eventId: "evt_100",
          universeId: "uni_100",
          title: "Battle of Camlann",
        },
      ]);

      await controller.listEventsByCharacter(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({
          eventId: "evt_100",
          title: "Battle of Camlann",
        }),
      ]);
    });
  });
});
