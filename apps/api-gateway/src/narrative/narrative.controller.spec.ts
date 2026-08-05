import { beforeEach, describe, expect, it, vi } from "vitest";
import { NarrativeController } from "./narrative.controller.js";

describe("NarrativeController", () => {
  let mockCreateWorkHandler: { execute: ReturnType<typeof vi.fn> };
  let mockGetWorkHandler: { execute: ReturnType<typeof vi.fn> };
  let mockCreateChapterHandler: { execute: ReturnType<typeof vi.fn> };
  let mockListChaptersHandler: { execute: ReturnType<typeof vi.fn> };
  let mockCreateSceneHandler: { execute: ReturnType<typeof vi.fn> };
  let mockListScenesHandler: { execute: ReturnType<typeof vi.fn> };
  let controller: NarrativeController;

  const stubWork = {
    workId: "work_001",
    universeId: "uni_001",
    title: "Stormlight Archive",
    workType: "NOVEL",
    draftStatus: "DRAFT",
    canonStatus: "DRAFT",
    createdBy: "usr_001",
    createdAt: new Date().toISOString(),
  };

  const stubChapter = {
    chapterId: "chap_001",
    workId: "work_001",
    title: "Chapter 1",
    sequenceNumber: 1,
    draftStatus: "DRAFT",
    createdBy: "usr_001",
    createdAt: new Date().toISOString(),
  };

  const stubScene = {
    sceneId: "scene_001",
    chapterId: "chap_001",
    title: "Opening Scene",
    sequenceNumber: 1,
    draftStatus: "DRAFT",
    characterIds: [],
    createdBy: "usr_001",
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    mockCreateWorkHandler = { execute: vi.fn().mockResolvedValue(stubWork) };
    mockGetWorkHandler = { execute: vi.fn().mockResolvedValue(stubWork) };
    mockCreateChapterHandler = { execute: vi.fn().mockResolvedValue(stubChapter) };
    mockListChaptersHandler = { execute: vi.fn().mockResolvedValue([stubChapter]) };
    mockCreateSceneHandler = { execute: vi.fn().mockResolvedValue(stubScene) };
    mockListScenesHandler = { execute: vi.fn().mockResolvedValue([stubScene]) };

    controller = new NarrativeController(
      mockCreateWorkHandler as never,
      mockGetWorkHandler as never,
      mockCreateChapterHandler as never,
      mockListChaptersHandler as never,
      mockCreateSceneHandler as never,
      mockListScenesHandler as never,
    );
  });

  // ── POST /universes/:universeId/works ───────────────────────────────────────

  describe("POST /universes/:universeId/works", () => {
    it("returns 201 with WorkDTO on success", async () => {
      const req = {
        params: { universeId: "uni_001" },
        body: { title: "Stormlight Archive", createdBy: "usr_001" },
      } as never;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as never;

      await controller.createWork(req, res);

      expect((res as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(201);
      expect((res as { json: ReturnType<typeof vi.fn> }).json).toHaveBeenCalledWith(
        expect.objectContaining({ workId: "work_001", title: "Stormlight Archive" }),
      );
    });

    it("returns 400 if title is missing", async () => {
      const req = { params: { universeId: "uni_001" }, body: { createdBy: "usr_001" } } as never;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as never;

      await controller.createWork(req, res);

      expect((res as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(400);
    });

    it("returns 422 on DomainValidationError", async () => {
      const { DomainValidationError } = await import("@storyos/domain-narrative");
      mockCreateWorkHandler.execute.mockRejectedValue(
        new DomainValidationError("universeId", "NOT_FOUND", "Universe not found"),
      );
      const req = {
        params: { universeId: "uni_bad" },
        body: { title: "Work", createdBy: "usr_001" },
      } as never;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as never;

      await controller.createWork(req, res);

      expect((res as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(422);
    });
  });

  // ── GET /works/:id ──────────────────────────────────────────────────────────

  describe("GET /works/:id", () => {
    it("returns 200 with WorkDTO when found", async () => {
      const req = { params: { id: "work_001" } } as never;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as never;

      await controller.getWorkById(req, res);

      expect((res as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(200);
      expect((res as { json: ReturnType<typeof vi.fn> }).json).toHaveBeenCalledWith(
        expect.objectContaining({ workId: "work_001" }),
      );
    });

    it("returns 404 when work not found", async () => {
      mockGetWorkHandler.execute.mockResolvedValue(null);
      const req = { params: { id: "work_missing" } } as never;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as never;

      await controller.getWorkById(req, res);

      expect((res as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(404);
    });
  });

  // ── POST /works/:workId/chapters ────────────────────────────────────────────

  describe("POST /works/:workId/chapters", () => {
    it("returns 201 with ChapterDTO on success", async () => {
      const req = {
        params: { workId: "work_001" },
        body: { title: "Chapter 1", createdBy: "usr_001" },
      } as never;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as never;

      await controller.createChapter(req, res);

      expect((res as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(201);
      expect((res as { json: ReturnType<typeof vi.fn> }).json).toHaveBeenCalledWith(
        expect.objectContaining({ chapterId: "chap_001", workId: "work_001" }),
      );
    });

    it("returns 400 if createdBy is missing", async () => {
      const req = { params: { workId: "work_001" }, body: { title: "Chapter" } } as never;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as never;

      await controller.createChapter(req, res);

      expect((res as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(400);
    });
  });

  // ── GET /works/:workId/chapters ─────────────────────────────────────────────

  describe("GET /works/:workId/chapters", () => {
    it("returns 200 with list of ChapterDTOs", async () => {
      const req = { params: { workId: "work_001" } } as never;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as never;

      await controller.listChaptersByWork(req, res);

      expect((res as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(200);
      expect((res as { json: ReturnType<typeof vi.fn> }).json).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ chapterId: "chap_001" })]),
      );
    });
  });

  // ── POST /chapters/:chapterId/scenes ────────────────────────────────────────

  describe("POST /chapters/:chapterId/scenes", () => {
    it("returns 201 with SceneDTO on success", async () => {
      const req = {
        params: { chapterId: "chap_001" },
        body: { title: "Opening Scene", createdBy: "usr_001" },
      } as never;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as never;

      await controller.createScene(req, res);

      expect((res as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(201);
      expect((res as { json: ReturnType<typeof vi.fn> }).json).toHaveBeenCalledWith(
        expect.objectContaining({ sceneId: "scene_001" }),
      );
    });

    it("returns 201 with characterIds and locationId when provided", async () => {
      const sceneWithRefs = { ...stubScene, characterIds: ["char_001"], locationId: "loc_001" };
      mockCreateSceneHandler.execute.mockResolvedValue(sceneWithRefs);

      const req = {
        params: { chapterId: "chap_001" },
        body: {
          title: "Battle Scene",
          characterIds: ["char_001"],
          locationId: "loc_001",
          createdBy: "usr_001",
        },
      } as never;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as never;

      await controller.createScene(req, res);

      expect((res as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(201);
      expect((res as { json: ReturnType<typeof vi.fn> }).json).toHaveBeenCalledWith(
        expect.objectContaining({ characterIds: ["char_001"], locationId: "loc_001" }),
      );
    });
  });

  // ── GET /chapters/:chapterId/scenes ─────────────────────────────────────────

  describe("GET /chapters/:chapterId/scenes", () => {
    it("returns 200 with list of SceneDTOs", async () => {
      const req = { params: { chapterId: "chap_001" } } as never;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as never;

      await controller.listScenesByChapter(req, res);

      expect((res as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(200);
      expect((res as { json: ReturnType<typeof vi.fn> }).json).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ sceneId: "scene_001" })]),
      );
    });
  });
});
