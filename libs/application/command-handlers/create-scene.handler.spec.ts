import { DomainValidationError } from "@storyos/domain-narrative";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateSceneCommandHandler } from "./create-scene.handler.js";

describe("CreateSceneCommandHandler", () => {
  let mockSceneRepo: {
    save: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByChapterId: ReturnType<typeof vi.fn>;
  };
  let mockChapterRepo: {
    findById: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    findByWorkId: ReturnType<typeof vi.fn>;
  };
  let mockCharacterRepo: { findById: ReturnType<typeof vi.fn> };
  let mockLocationRepo: { findById: ReturnType<typeof vi.fn> };
  let mockPublisher: { publish: ReturnType<typeof vi.fn> };
  let handler: CreateSceneCommandHandler;

  const stubChapter = { chapterId: "chap_001", workId: "work_001" };
  const stubCharacter = { characterId: "char_001", universeId: "uni_001" };
  const stubLocation = { locationId: "loc_001", universeId: "uni_001" };

  beforeEach(() => {
    mockSceneRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
      findByChapterId: vi.fn(),
    };
    mockChapterRepo = {
      findById: vi.fn().mockResolvedValue(stubChapter),
      save: vi.fn(),
      findByWorkId: vi.fn(),
    };
    mockCharacterRepo = { findById: vi.fn().mockResolvedValue(stubCharacter) };
    mockLocationRepo = { findById: vi.fn().mockResolvedValue(stubLocation) };
    mockPublisher = { publish: vi.fn().mockResolvedValue(undefined) };
    handler = new CreateSceneCommandHandler(
      mockSceneRepo,
      mockChapterRepo,
      mockCharacterRepo,
      mockLocationRepo,
      mockPublisher,
    );
  });

  it("creates a scene with no participants or location", async () => {
    const result = await handler.execute({
      chapterId: "chap_001",
      title: "A Quiet Night",
      createdBy: "usr_001",
    });

    expect(result.title).toBe("A Quiet Night");
    expect(result.chapterId).toBe("chap_001");
    expect(result.characterIds).toEqual([]);
    expect(result.locationId).toBeUndefined();
    expect(result.draftStatus).toBe("DRAFT");
    expect(mockSceneRepo.save).toHaveBeenCalledOnce();
  });

  it("creates a scene with characterIds and locationId", async () => {
    const result = await handler.execute({
      chapterId: "chap_001",
      title: "The Throne Room Confrontation",
      characterIds: ["char_001"],
      locationId: "loc_001",
      createdBy: "usr_001",
    });

    expect(result.characterIds).toContain("char_001");
    expect(result.locationId).toBe("loc_001");
  });

  it("uses provided sceneId when supplied", async () => {
    const result = await handler.execute({
      sceneId: "scene_explicit_001",
      chapterId: "chap_001",
      title: "Custom Scene",
      createdBy: "usr_001",
    });
    expect(result.sceneId).toBe("scene_explicit_001");
  });

  it("throws DomainValidationError if chapter does not exist", async () => {
    mockChapterRepo.findById.mockResolvedValue(null);

    await expect(
      handler.execute({ chapterId: "chap_missing", title: "Scene", createdBy: "usr_001" }),
    ).rejects.toThrow(DomainValidationError);
  });

  it("throws DomainValidationError if referenced character does not exist", async () => {
    mockCharacterRepo.findById.mockResolvedValue(null);

    await expect(
      handler.execute({
        chapterId: "chap_001",
        title: "Scene",
        characterIds: ["char_missing"],
        createdBy: "usr_001",
      }),
    ).rejects.toThrow(DomainValidationError);
  });

  it("throws DomainValidationError if referenced location does not exist", async () => {
    mockLocationRepo.findById.mockResolvedValue(null);

    await expect(
      handler.execute({
        chapterId: "chap_001",
        title: "Scene",
        locationId: "loc_missing",
        createdBy: "usr_001",
      }),
    ).rejects.toThrow(DomainValidationError);
  });

  it("throws DomainValidationError for empty title", async () => {
    await expect(
      handler.execute({ chapterId: "chap_001", title: "", createdBy: "usr_001" }),
    ).rejects.toThrow(DomainValidationError);
  });

  it("publishes SceneCreatedEvent", async () => {
    await handler.execute({ chapterId: "chap_001", title: "Night Fight", createdBy: "usr_001" });

    expect(mockPublisher.publish).toHaveBeenCalledOnce();
    const [topic, event] = mockPublisher.publish.mock.calls[0] as [string, Record<string, unknown>];
    expect(topic).toBe("narrative-events");
    expect(event.eventType).toBe("SceneCreated");
  });

  it("works without characterRepo/locationRepo (no cross-domain validation)", async () => {
    const minimalHandler = new CreateSceneCommandHandler(mockSceneRepo, mockChapterRepo);
    const result = await minimalHandler.execute({
      chapterId: "chap_001",
      title: "Simple Scene",
      characterIds: ["char_001"],
      locationId: "loc_001",
      createdBy: "usr_001",
    });
    expect(result.characterIds).toContain("char_001");
    expect(result.locationId).toBe("loc_001");
  });
});
