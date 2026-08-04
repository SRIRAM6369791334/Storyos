import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RelationshipController } from "./relationship.controller.js";

describe("RelationshipController", () => {
  let mockCreateHandler: any;
  let mockGetHandler: any;
  let mockListByCharacterHandler: any;
  let controller: RelationshipController;

  beforeEach(() => {
    mockCreateHandler = { execute: vi.fn() };
    mockGetHandler = { execute: vi.fn() };
    mockListByCharacterHandler = { execute: vi.fn() };

    const mockPostgresClient = { close: vi.fn().mockResolvedValue(undefined) } as any;
    const mockNeo4jClient = { close: vi.fn().mockResolvedValue(undefined) } as any;
    const mockKafkaClient = { close: vi.fn().mockResolvedValue(undefined) } as any;

    controller = new RelationshipController(
      mockCreateHandler,
      mockGetHandler,
      mockListByCharacterHandler,
      mockPostgresClient,
      mockNeo4jClient,
      mockKafkaClient,
    );
  });

  afterEach(async () => {
    await controller.close();
  });

  describe("POST /universes/:universeId/relationships", () => {
    it("returns 201 Created when relationship creation succeeds", async () => {
      const req = {
        params: { universeId: "uni_100" },
        body: {
          relationshipId: "rel_100",
          sourceCharacterId: "char_1",
          targetCharacterId: "char_2",
          relationshipType: "ALLY",
          createdBy: "usr_100",
        },
      } as any;

      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockCreateHandler.execute.mockResolvedValue({
        relationshipId: "rel_100",
        universeId: "uni_100",
        sourceCharacterId: "char_1",
        targetCharacterId: "char_2",
        relationshipType: "ALLY",
        direction: "DIRECTED",
        status: "ACTIVE",
        canonStatus: "DRAFT",
        createdBy: "usr_100",
        createdAt: new Date().toISOString(),
      });

      await controller.createRelationship(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          relationshipId: "rel_100",
          relationshipType: "ALLY",
        }),
      );
    });
  });

  describe("GET /relationships/:id", () => {
    it("returns 200 OK with RelationshipDTO when relationship exists", async () => {
      const req = { params: { id: "rel_200" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockGetHandler.execute.mockResolvedValue({
        relationshipId: "rel_200",
        universeId: "uni_100",
        sourceCharacterId: "char_1",
        targetCharacterId: "char_2",
        relationshipType: "ENEMY",
        direction: "DIRECTED",
        status: "ACTIVE",
        canonStatus: "CANON",
        createdBy: "usr_100",
        createdAt: new Date().toISOString(),
      });

      await controller.getRelationshipById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          relationshipId: "rel_200",
          relationshipType: "ENEMY",
        }),
      );
    });
  });

  describe("GET /characters/:characterId/relationships", () => {
    it("returns 200 OK with list of relationships for character", async () => {
      const req = { params: { characterId: "char_1" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockListByCharacterHandler.execute.mockResolvedValue([
        {
          relationshipId: "rel_100",
          universeId: "uni_100",
          sourceCharacterId: "char_1",
          targetCharacterId: "char_2",
          relationshipType: "ALLY",
        },
      ]);

      await controller.listRelationshipsByCharacter(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({
          relationshipId: "rel_100",
          relationshipType: "ALLY",
        }),
      ]);
    });
  });
});
