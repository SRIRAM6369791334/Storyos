import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CharacterController } from "./character.controller.js";

describe("CharacterController", () => {
  let mockCreateHandler: any;
  let mockGetHandler: any;
  let mockListHandler: any;
  let controller: CharacterController;

  beforeEach(() => {
    mockCreateHandler = { execute: vi.fn() };
    mockGetHandler = { execute: vi.fn() };
    mockListHandler = { execute: vi.fn() };

    const mockPostgresClient = {
      close: vi.fn().mockResolvedValue(undefined),
    } as any;

    const mockKafkaClient = {
      close: vi.fn().mockResolvedValue(undefined),
    } as any;

    controller = new CharacterController(
      mockCreateHandler,
      mockGetHandler,
      mockListHandler,
      mockPostgresClient,
      mockKafkaClient,
    );
  });

  afterEach(async () => {
    await controller.close();
  });

  describe("POST /universes/:universeId/characters", () => {
    it("returns 201 Created when character creation succeeds", async () => {
      const req = {
        params: { universeId: "uni_100" },
        body: {
          characterId: "char_100",
          primaryName: "Arthur Pendelton",
          createdBy: "usr_100",
        },
      } as any;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      mockCreateHandler.execute.mockResolvedValue({
        characterId: "char_100",
        universeId: "uni_100",
        primaryName: "Arthur Pendelton",
        status: "DRAFT",
        canonStatus: "DRAFT",
        createdBy: "usr_100",
        createdAt: new Date().toISOString(),
      });

      await controller.createCharacter(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          characterId: "char_100",
          primaryName: "Arthur Pendelton",
        }),
      );
      expect(mockCreateHandler.execute).toHaveBeenCalledWith({
        characterId: "char_100",
        universeId: "uni_100",
        primaryName: "Arthur Pendelton",
        createdBy: "usr_100",
      });
    });

    it("returns 400 Bad Request when primaryName or createdBy is missing", async () => {
      const req = {
        params: { universeId: "uni_100" },
        body: { primaryName: "" },
      } as any;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      await controller.createCharacter(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "BAD_REQUEST",
        }),
      );
    });
  });

  describe("GET /characters/:id", () => {
    it("returns 200 OK with CharacterDTO when character exists", async () => {
      const req = {
        params: { id: "char_200" },
      } as any;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      mockGetHandler.execute.mockResolvedValue({
        characterId: "char_200",
        universeId: "uni_100",
        primaryName: "Gwenevere",
        status: "ACTIVE",
        canonStatus: "CANON",
        createdBy: "usr_100",
        createdAt: new Date().toISOString(),
      });

      await controller.getCharacterById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          characterId: "char_200",
          primaryName: "Gwenevere",
        }),
      );
    });

    it("returns 404 Not Found when character does not exist", async () => {
      const req = {
        params: { id: "char_missing" },
      } as any;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      mockGetHandler.execute.mockResolvedValue(null);

      await controller.getCharacterById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "NOT_FOUND",
        }),
      );
    });
  });

  describe("GET /universes/:universeId/characters", () => {
    it("returns 200 OK with list of CharacterDTOs", async () => {
      const req = {
        params: { universeId: "uni_100" },
      } as any;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      mockListHandler.execute.mockResolvedValue([
        {
          characterId: "char_1",
          universeId: "uni_100",
          primaryName: "Lancelot",
        },
      ]);

      await controller.listCharactersByUniverse(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({
          characterId: "char_1",
          primaryName: "Lancelot",
        }),
      ]);
      expect(mockListHandler.execute).toHaveBeenCalledWith({ universeId: "uni_100" });
    });
  });
});
