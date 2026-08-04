import { beforeEach, describe, expect, it, vi } from "vitest";
import { UniverseController } from "./universe.controller.js";

describe("UniverseController", () => {
  let mockCreateHandler: any;
  let mockGetHandler: any;
  let controller: UniverseController;

  beforeEach(() => {
    mockCreateHandler = {
      execute: vi.fn(),
    };
    mockGetHandler = {
      execute: vi.fn(),
    };

    const mockPostgresClient = {
      close: vi.fn().mockResolvedValue(undefined),
    } as any;

    const mockKafkaClient = {
      close: vi.fn().mockResolvedValue(undefined),
    } as any;

    controller = new UniverseController(
      mockCreateHandler,
      mockGetHandler,
      mockPostgresClient,
      mockKafkaClient,
    );
  });

  afterEach(async () => {
    await controller.close();
  });

  describe("POST /universes", () => {
    it("returns 201 Created when universe creation succeeds", async () => {
      const req = {
        body: {
          universeId: "uni_ctrl_1",
          organizationId: "org_ctrl_1",
          title: "Controller Test Universe",
          createdBy: "usr_ctrl_1",
          synopsis: "A test universe from controller",
        },
      } as any;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      mockCreateHandler.execute.mockResolvedValue({
        universeId: "uni_ctrl_1",
        organizationId: "org_ctrl_1",
        title: "Controller Test Universe",
        status: "DRAFT",
        createdBy: "usr_ctrl_1",
        createdAt: new Date().toISOString(),
        synopsis: "A test universe from controller",
        genre: [],
        linkedUniverseIds: [],
      });

      await controller.createUniverse(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          universeId: "uni_ctrl_1",
          title: "Controller Test Universe",
        }),
      );
      expect(mockCreateHandler.execute).toHaveBeenCalledWith(req.body);
    });

    it("returns 400 Bad Request when required body parameters are missing", async () => {
      const req = {
        body: {
          title: "Missing Organization and CreatedBy",
        },
      } as any;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      await controller.createUniverse(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "BAD_REQUEST",
        }),
      );
      expect(mockCreateHandler.execute).not.toHaveBeenCalled();
    });
  });

  describe("GET /universes/:id", () => {
    it("returns 200 OK with UniverseDTO when universe exists", async () => {
      const req = {
        params: { id: "uni_found_100" },
      } as any;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      mockGetHandler.execute.mockResolvedValue({
        universeId: "uni_found_100",
        organizationId: "org_found",
        title: "Found Via Controller",
        status: "ACTIVE",
        createdBy: "usr_found",
        createdAt: new Date().toISOString(),
        genre: ["FANTASY"],
        linkedUniverseIds: [],
      });

      await controller.getUniverseById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          universeId: "uni_found_100",
          title: "Found Via Controller",
        }),
      );
      expect(mockGetHandler.execute).toHaveBeenCalledWith({ universeId: "uni_found_100" });
    });

    it("returns 404 Not Found when universe does not exist", async () => {
      const req = {
        params: { id: "uni_nonexistent" },
      } as any;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      mockGetHandler.execute.mockResolvedValue(null);

      await controller.getUniverseById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "NOT_FOUND",
        }),
      );
    });
  });
});
