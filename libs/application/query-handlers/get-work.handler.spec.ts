import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetWorkQueryHandler } from "./get-work.handler.js";

describe("GetWorkQueryHandler", () => {
  let mockWorkRepo: {
    findById: ReturnType<typeof vi.fn>;
    findByUniverseId: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let handler: GetWorkQueryHandler;

  beforeEach(() => {
    mockWorkRepo = { findById: vi.fn(), findByUniverseId: vi.fn(), save: vi.fn() };
    handler = new GetWorkQueryHandler(mockWorkRepo);
  });

  it("returns WorkDTO when work exists", async () => {
    const fakeWork = {
      workId: "work_001",
      universeId: "uni_001",
      title: { toString: () => "Dune" },
      workType: "NOVEL",
      draftStatus: "DRAFT",
      canonStatus: "DRAFT",
      createdBy: "usr_001",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    };
    mockWorkRepo.findById.mockResolvedValue(fakeWork);

    const result = await handler.execute({ workId: "work_001" });

    expect(result).not.toBeNull();
    expect(result?.workId).toBe("work_001");
    expect(result?.title).toBe("Dune");
    expect(result?.workType).toBe("NOVEL");
  });

  it("returns null when work does not exist", async () => {
    mockWorkRepo.findById.mockResolvedValue(null);
    const result = await handler.execute({ workId: "work_missing" });
    expect(result).toBeNull();
  });
});

describe("ListChaptersByWorkQueryHandler", () => {
  it("returns list of ChapterDTOs", async () => {
    const { ListChaptersByWorkQueryHandler } = await import("./list-chapters-by-work.handler.js");
    const mockChapterRepo = {
      findByWorkId: vi.fn().mockResolvedValue([
        {
          chapterId: "chap_001",
          workId: "work_001",
          title: { toString: () => "First Chapter" },
          sequenceNumber: 1,
          draftStatus: "DRAFT",
          createdBy: "usr_001",
          createdAt: new Date("2026-01-01T00:00:00Z"),
        },
      ]),
      findById: vi.fn(),
      save: vi.fn(),
    };
    const handler = new ListChaptersByWorkQueryHandler(mockChapterRepo);
    const result = await handler.execute({ workId: "work_001" });

    expect(result).toHaveLength(1);
    expect(result[0]?.chapterId).toBe("chap_001");
    expect(result[0]?.title).toBe("First Chapter");
    expect(result[0]?.sequenceNumber).toBe(1);
  });

  it("returns empty array when no chapters", async () => {
    const { ListChaptersByWorkQueryHandler } = await import("./list-chapters-by-work.handler.js");
    const mockChapterRepo = {
      findByWorkId: vi.fn().mockResolvedValue([]),
      findById: vi.fn(),
      save: vi.fn(),
    };
    const handler = new ListChaptersByWorkQueryHandler(mockChapterRepo);
    const result = await handler.execute({ workId: "work_empty" });
    expect(result).toEqual([]);
  });
});

describe("ListScenesByChapterQueryHandler", () => {
  it("returns list of SceneDTOs", async () => {
    const { ListScenesByChapterQueryHandler } = await import("./list-scenes-by-chapter.handler.js");
    const mockSceneRepo = {
      findByChapterId: vi.fn().mockResolvedValue([
        {
          sceneId: "scene_001",
          chapterId: "chap_001",
          title: { toString: () => "Opening" },
          sequenceNumber: 1,
          draftStatus: "DRAFT",
          characterIds: ["char_001"],
          locationId: "loc_001",
          createdBy: "usr_001",
          createdAt: new Date("2026-01-01T00:00:00Z"),
        },
      ]),
      findById: vi.fn(),
      save: vi.fn(),
    };
    const handler = new ListScenesByChapterQueryHandler(mockSceneRepo);
    const result = await handler.execute({ chapterId: "chap_001" });

    expect(result).toHaveLength(1);
    expect(result[0]?.sceneId).toBe("scene_001");
    expect(result[0]?.characterIds).toContain("char_001");
    expect(result[0]?.locationId).toBe("loc_001");
  });

  it("returns empty array when no scenes", async () => {
    const { ListScenesByChapterQueryHandler } = await import("./list-scenes-by-chapter.handler.js");
    const mockSceneRepo = {
      findByChapterId: vi.fn().mockResolvedValue([]),
      findById: vi.fn(),
      save: vi.fn(),
    };
    const handler = new ListScenesByChapterQueryHandler(mockSceneRepo);
    const result = await handler.execute({ chapterId: "chap_empty" });
    expect(result).toEqual([]);
  });
});
