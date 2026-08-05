import { DomainValidationError } from "@storyos/domain-narrative";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateChapterCommandHandler } from "./create-chapter.handler.js";

describe("CreateChapterCommandHandler", () => {
  let mockChapterRepo: {
    save: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByWorkId: ReturnType<typeof vi.fn>;
  };
  let mockWorkRepo: {
    findById: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    findByUniverseId: ReturnType<typeof vi.fn>;
  };
  let mockPublisher: { publish: ReturnType<typeof vi.fn> };
  let handler: CreateChapterCommandHandler;

  const stubWork = { workId: "work_001", universeId: "uni_001" };

  beforeEach(() => {
    mockChapterRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
      findByWorkId: vi.fn(),
    };
    mockWorkRepo = {
      findById: vi.fn().mockResolvedValue(stubWork),
      save: vi.fn(),
      findByUniverseId: vi.fn(),
    };
    mockPublisher = { publish: vi.fn().mockResolvedValue(undefined) };
    handler = new CreateChapterCommandHandler(mockChapterRepo, mockWorkRepo, mockPublisher);
  });

  it("creates a chapter and returns ChapterDTO", async () => {
    const result = await handler.execute({
      workId: "work_001",
      title: "Chapter One: The Beginning",
      createdBy: "usr_001",
    });

    expect(result.title).toBe("Chapter One: The Beginning");
    expect(result.workId).toBe("work_001");
    expect(result.draftStatus).toBe("DRAFT");
    expect(result.sequenceNumber).toBe(1);
    expect(result.chapterId).toBeTruthy();
    expect(mockChapterRepo.save).toHaveBeenCalledOnce();
  });

  it("creates chapter with explicit sequenceNumber", async () => {
    const result = await handler.execute({
      workId: "work_001",
      title: "Chapter Three",
      sequenceNumber: 3,
      createdBy: "usr_001",
    });
    expect(result.sequenceNumber).toBe(3);
  });

  it("uses provided chapterId when supplied", async () => {
    const result = await handler.execute({
      chapterId: "chap_explicit_001",
      workId: "work_001",
      title: "Explicit Chapter",
      createdBy: "usr_001",
    });
    expect(result.chapterId).toBe("chap_explicit_001");
  });

  it("throws DomainValidationError if work does not exist", async () => {
    mockWorkRepo.findById.mockResolvedValue(null);

    await expect(
      handler.execute({ workId: "work_missing", title: "Chapter", createdBy: "usr_001" }),
    ).rejects.toThrow(DomainValidationError);
  });

  it("throws DomainValidationError for empty title", async () => {
    await expect(
      handler.execute({ workId: "work_001", title: "", createdBy: "usr_001" }),
    ).rejects.toThrow(DomainValidationError);
  });

  it("publishes ChapterCreatedEvent", async () => {
    await handler.execute({ workId: "work_001", title: "A Fine Chapter", createdBy: "usr_001" });

    expect(mockPublisher.publish).toHaveBeenCalledOnce();
    const [topic, event] = mockPublisher.publish.mock.calls[0] as [string, Record<string, unknown>];
    expect(topic).toBe("narrative-events");
    expect(event.eventType).toBe("ChapterCreated");
    expect(event.workId).toBe("work_001");
  });
});
