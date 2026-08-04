import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocationController } from "./location.controller.js";

describe("LocationController", () => {
  let mockCreateHandler: any;
  let mockGetHandler: any;
  let mockListByUniverseHandler: any;
  let mockListChildrenHandler: any;
  let controller: LocationController;

  beforeEach(() => {
    mockCreateHandler = { execute: vi.fn() };
    mockGetHandler = { execute: vi.fn() };
    mockListByUniverseHandler = { execute: vi.fn() };
    mockListChildrenHandler = { execute: vi.fn() };

    const mockPostgresClient = {
      close: vi.fn().mockResolvedValue(undefined),
    } as any;

    const mockKafkaClient = {
      close: vi.fn().mockResolvedValue(undefined),
    } as any;

    controller = new LocationController(
      mockCreateHandler,
      mockGetHandler,
      mockListByUniverseHandler,
      mockListChildrenHandler,
      mockPostgresClient,
      mockKafkaClient,
    );
  });

  afterEach(async () => {
    await controller.close();
  });

  describe("POST /universes/:universeId/locations", () => {
    it("returns 201 Created when location creation succeeds", async () => {
      const req = {
        params: { universeId: "uni_100" },
        body: {
          locationId: "loc_100",
          name: "Camelot",
          createdBy: "usr_100",
        },
      } as any;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      mockCreateHandler.execute.mockResolvedValue({
        locationId: "loc_100",
        universeId: "uni_100",
        name: "Camelot",
        locationType: "CITY",
        canonStatus: "DRAFT",
        createdBy: "usr_100",
        createdAt: new Date().toISOString(),
      });

      await controller.createLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          locationId: "loc_100",
          name: "Camelot",
        }),
      );
    });
  });

  describe("GET /locations/:id", () => {
    it("returns 200 OK with LocationDTO when location exists", async () => {
      const req = { params: { id: "loc_200" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockGetHandler.execute.mockResolvedValue({
        locationId: "loc_200",
        universeId: "uni_100",
        name: "Round Table Room",
        locationType: "ROOM",
        canonStatus: "CANON",
        createdBy: "usr_100",
        createdAt: new Date().toISOString(),
      });

      await controller.getLocationById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          locationId: "loc_200",
          name: "Round Table Room",
        }),
      );
    });
  });

  describe("GET /locations/:id/children", () => {
    it("returns 200 OK with list of child locations", async () => {
      const req = { params: { id: "loc_parent" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockListChildrenHandler.execute.mockResolvedValue([
        {
          locationId: "loc_child_1",
          universeId: "uni_100",
          parentLocationId: "loc_parent",
          name: "Inner Courtyard",
        },
      ]);

      await controller.listChildLocations(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({
          locationId: "loc_child_1",
          name: "Inner Courtyard",
        }),
      ]);
      expect(mockListChildrenHandler.execute).toHaveBeenCalledWith({ parentId: "loc_parent" });
    });
  });
});
