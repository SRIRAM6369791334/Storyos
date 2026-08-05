import { DomainValidationError } from "@storyos/domain-narrative";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateWorkCommandHandler } from "./create-work.handler.js";

describe("CreateWorkCommandHandler", () => {
  let mockWorkRepo: {
    save: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByUniverseId: ReturnType<typeof vi.fn>;
  };
  let mockUniverseRepo: { findById: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> };
  let mockPublisher: { publish: ReturnType<typeof vi.fn> };
  let handler: CreateWorkCommandHandler;

  beforeEach(() => {
    mockWorkRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
      findByUniverseId: vi.fn(),
    };
    mockUniverseRepo = {
      findById: vi.fn().mockResolvedValue({ universeId: "uni_001" }),
      save: vi.fn(),
    };
    mockPublisher = { publish: vi.fn().mockResolvedValue(undefined) };
    handler = new CreateWorkCommandHandler(mockWorkRepo, mockUniverseRepo, mockPublisher);
  });

  it("creates a work and returns WorkDTO", async () => {
    const result = await handler.execute({
      universeId: "uni_001",
      title: "The Name of the Wind",
      createdBy: "usr_001",
    });

    expect(result.title).toBe("The Name of the Wind");
    expect(result.universeId).toBe("uni_001");
    expect(result.draftStatus).toBe("DRAFT");
    expect(result.canonStatus).toBe("DRAFT");
    expect(result.workType).toBe("OTHER");
    expect(result.workId).toBeTruthy();
    expect(mockWorkRepo.save).toHaveBeenCalledOnce();
  });

  it("uses provided workId when supplied", async () => {
    const result = await handler.execute({
      workId: "work_custom_001",
      universeId: "uni_001",
      title: "Custom Work",
      createdBy: "usr_001",
    });
    expect(result.workId).toBe("work_custom_001");
  });

  it("throws DomainValidationError if universe does not exist", async () => {
    mockUniverseRepo.findById.mockResolvedValue(null);

    await expect(
      handler.execute({ universeId: "uni_missing", title: "Work", createdBy: "usr_001" }),
    ).rejects.toThrow(DomainValidationError);
  });

  it("throws DomainValidationError for empty title", async () => {
    await expect(
      handler.execute({ universeId: "uni_001", title: "", createdBy: "usr_001" }),
    ).rejects.toThrow(DomainValidationError);
  });

  it("publishes WorkCreatedEvent to narrative-events topic", async () => {
    await handler.execute({ universeId: "uni_001", title: "Epic Novel", createdBy: "usr_001" });

    expect(mockPublisher.publish).toHaveBeenCalledOnce();
    const [topic, event] = mockPublisher.publish.mock.calls[0] as [string, Record<string, unknown>];
    expect(topic).toBe("narrative-events");
    expect(event.eventType).toBe("WorkCreated");
    expect(event.title).toBe("Epic Novel");
  });

  it("does not throw if no event publisher provided", async () => {
    const handlerNoPublisher = new CreateWorkCommandHandler(mockWorkRepo, mockUniverseRepo);
    await expect(
      handlerNoPublisher.execute({ universeId: "uni_001", title: "Work", createdBy: "usr_001" }),
    ).resolves.toBeDefined();
  });
});
