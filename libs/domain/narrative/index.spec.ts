import { describe, expect, it } from "vitest";
import {
  CanonStatus,
  Chapter,
  ChapterTitle,
  DomainValidationError,
  DraftStatus,
  Scene,
  SceneTitle,
  Work,
  WorkTitle,
  WorkType,
  createChapterId,
  createCharacterId,
  createLocationId,
  createSceneId,
  createUniverseId,
  createUserId,
  createWorkId,
} from "./index.js";

// ─── Work Aggregate Tests ────────────────────────────────────────────────────

describe("WorkTitle", () => {
  it("creates a valid work title", () => {
    const title = WorkTitle.create("The Fellowship of the Ring");
    expect(title.toString()).toBe("The Fellowship of the Ring");
  });

  it("throws DomainValidationError for empty title", () => {
    expect(() => WorkTitle.create("")).toThrow(DomainValidationError);
    expect(() => WorkTitle.create("   ")).toThrow(DomainValidationError);
  });

  it("throws DomainValidationError for title exceeding 400 chars", () => {
    const tooLong = "a".repeat(401);
    const err = (() => {
      try {
        WorkTitle.create(tooLong);
      } catch (e) {
        return e;
      }
    })();
    expect(err).toBeInstanceOf(DomainValidationError);
    expect((err as DomainValidationError).rule).toBe("MAX_LENGTH");
  });

  it("accepts exactly 400 characters", () => {
    const maxLen = "a".repeat(400);
    const title = WorkTitle.create(maxLen);
    expect(title.toString().length).toBe(400);
  });

  it("rejects control characters", () => {
    expect(() => WorkTitle.create("bad\x01title")).toThrow(DomainValidationError);
  });
});

describe("Work.create", () => {
  const workId = createWorkId("work_001");
  const universeId = createUniverseId("uni_001");
  const createdBy = createUserId("usr_001");
  const title = WorkTitle.create("A Game of Thrones");

  it("creates a Work with required fields and defaults", () => {
    const work = Work.create({ workId, universeId, title, createdBy });
    expect(work.workId).toBe("work_001");
    expect(work.universeId).toBe("uni_001");
    expect(work.createdBy).toBe("usr_001");
    expect(work.title.toString()).toBe("A Game of Thrones");
    expect(work.workType).toBe(WorkType.OTHER);
    expect(work.draftStatus).toBe(DraftStatus.DRAFT);
    expect(work.canonStatus).toBe(CanonStatus.DRAFT);
    expect(work.createdAt).toBeInstanceOf(Date);
  });

  it("creates a Work with explicit workType and draftStatus", () => {
    const work = Work.create({
      workId,
      universeId,
      title,
      createdBy,
      workType: WorkType.NOVEL,
      draftStatus: DraftStatus.IN_REVIEW,
      canonStatus: CanonStatus.PENDING,
    });
    expect(work.workType).toBe(WorkType.NOVEL);
    expect(work.draftStatus).toBe(DraftStatus.IN_REVIEW);
    expect(work.canonStatus).toBe(CanonStatus.PENDING);
  });

  it("immutable universeId — same reference after creation", () => {
    const work = Work.create({ workId, universeId, title, createdBy });
    expect(work.universeId).toBe(universeId);
  });
});

describe("createWorkId", () => {
  it("returns a branded WorkId string", () => {
    const id = createWorkId("work_abc");
    expect(id).toBe("work_abc");
  });

  it("throws for empty string", () => {
    expect(() => createWorkId("")).toThrow(DomainValidationError);
  });

  it("throws for whitespace-only string", () => {
    expect(() => createWorkId("   ")).toThrow(DomainValidationError);
  });
});

// ─── Chapter Aggregate Tests ─────────────────────────────────────────────────

describe("ChapterTitle", () => {
  it("creates a valid chapter title", () => {
    const t = ChapterTitle.create("The Prologue");
    expect(t.toString()).toBe("The Prologue");
  });

  it("throws for empty chapter title", () => {
    expect(() => ChapterTitle.create("")).toThrow(DomainValidationError);
  });
});

describe("Chapter.create", () => {
  const chapterId = createChapterId("chap_001");
  const workId = createWorkId("work_001");
  const createdBy = createUserId("usr_001");
  const title = ChapterTitle.create("The Great War");

  it("creates Chapter with required fields and defaults", () => {
    const chapter = Chapter.create({ chapterId, workId, title, createdBy });
    expect(chapter.chapterId).toBe("chap_001");
    expect(chapter.workId).toBe("work_001");
    expect(chapter.title.toString()).toBe("The Great War");
    expect(chapter.sequenceNumber).toBe(1);
    expect(chapter.draftStatus).toBe(DraftStatus.DRAFT);
    expect(chapter.createdAt).toBeInstanceOf(Date);
  });

  it("creates Chapter with explicit sequenceNumber", () => {
    const chapter = Chapter.create({ chapterId, workId, title, createdBy, sequenceNumber: 5 });
    expect(chapter.sequenceNumber).toBe(5);
  });

  it("creates Chapter with explicit draftStatus", () => {
    const chapter = Chapter.create({
      chapterId,
      workId,
      title,
      createdBy,
      draftStatus: DraftStatus.IN_REVIEW,
    });
    expect(chapter.draftStatus).toBe(DraftStatus.IN_REVIEW);
  });
});

// ─── Scene Aggregate Tests ───────────────────────────────────────────────────

describe("SceneTitle", () => {
  it("creates a valid scene title", () => {
    const t = SceneTitle.create("The Battle of Helms Deep");
    expect(t.toString()).toBe("The Battle of Helms Deep");
  });

  it("throws for empty scene title", () => {
    expect(() => SceneTitle.create("")).toThrow(DomainValidationError);
  });
});

describe("Scene.create", () => {
  const sceneId = createSceneId("scene_001");
  const chapterId = createChapterId("chap_001");
  const createdBy = createUserId("usr_001");
  const title = SceneTitle.create("Opening Scene");

  it("creates Scene with required fields and defaults", () => {
    const scene = Scene.create({ sceneId, chapterId, title, createdBy });
    expect(scene.sceneId).toBe("scene_001");
    expect(scene.chapterId).toBe("chap_001");
    expect(scene.title.toString()).toBe("Opening Scene");
    expect(scene.sequenceNumber).toBe(1);
    expect(scene.draftStatus).toBe(DraftStatus.DRAFT);
    expect(scene.characterIds).toEqual([]);
    expect(scene.locationId).toBeUndefined();
    expect(scene.createdAt).toBeInstanceOf(Date);
  });

  it("creates Scene with optional characterIds and locationId", () => {
    const characterIds = [createCharacterId("char_001"), createCharacterId("char_002")];
    const locationId = createLocationId("loc_001");
    const scene = Scene.create({
      sceneId,
      chapterId,
      title,
      createdBy,
      characterIds,
      locationId,
    });
    expect(scene.characterIds).toEqual(["char_001", "char_002"]);
    expect(scene.locationId).toBe("loc_001");
  });

  it("characterIds getter returns a copy (immutability)", () => {
    const characterIds = [createCharacterId("char_001")];
    const scene = Scene.create({ sceneId, chapterId, title, createdBy, characterIds });
    const returned = scene.characterIds;
    returned.push(createCharacterId("char_injected"));
    expect(scene.characterIds.length).toBe(1);
  });

  it("creates Scene with explicit draftStatus", () => {
    const scene = Scene.create({
      sceneId,
      chapterId,
      title,
      createdBy,
      draftStatus: DraftStatus.CANON,
    });
    expect(scene.draftStatus).toBe(DraftStatus.CANON);
  });
});

// ─── DraftStatus Enum Tests ──────────────────────────────────────────────────

describe("DraftStatus", () => {
  it("has the correct 4 values", () => {
    expect(Object.values(DraftStatus)).toEqual(["DRAFT", "IN_REVIEW", "CANON", "ARCHIVED"]);
  });
});

describe("WorkType", () => {
  it("has the correct 6 values", () => {
    expect(Object.values(WorkType)).toEqual([
      "NOVEL",
      "SCREENPLAY",
      "COMIC",
      "GAME",
      "ANTHOLOGY",
      "OTHER",
    ]);
  });
});
