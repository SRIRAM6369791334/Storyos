import { DomainValidationError } from "@storyos/domain-universe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateUniverseCommandHandler } from "./create-universe.handler.js";

describe("CreateUniverseCommandHandler", () => {
  let mockRepo: any;
  let mockPublisher: any;
  let handler: CreateUniverseCommandHandler;

  beforeEach(() => {
    mockRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    mockPublisher = {
      publish: vi.fn().mockResolvedValue(undefined),
    };

    handler = new CreateUniverseCommandHandler(mockRepo, mockPublisher);
  });

  it("creates and saves a valid Story Universe and publishes UniverseCreatedEvent", async () => {
    const command = {
      universeId: "uni_test_100",
      organizationId: "org_test_100",
      title: "The Shattered Chronicles",
      createdBy: "usr_test_100",
      synopsis: "An epic tale across fragmented dimensions.",
    };

    const result = await handler.execute(command);

    expect(result.universeId).toBe("uni_test_100");
    expect(result.organizationId).toBe("org_test_100");
    expect(result.title).toBe("The Shattered Chronicles");
    expect(result.status).toBe("DRAFT");
    expect(result.synopsis).toBe("An epic tale across fragmented dimensions.");

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(mockPublisher.publish).toHaveBeenCalledWith(
      "universe-events",
      expect.objectContaining({
        eventType: "UniverseCreated",
        universeId: "uni_test_100",
        organizationId: "org_test_100",
        title: "The Shattered Chronicles",
      }),
    );
  });

  it("generates an ID automatically if universeId is omitted", async () => {
    const command = {
      organizationId: "org_test_100",
      title: "Auto Generated ID Universe",
      createdBy: "usr_test_100",
    };

    const result = await handler.execute(command);

    expect(result.universeId).toMatch(/^uni_/);
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
  });

  it("throws DomainValidationError if title is empty", async () => {
    const command = {
      organizationId: "org_test_100",
      title: "",
      createdBy: "usr_test_100",
    };

    await expect(handler.execute(command)).rejects.toThrow(DomainValidationError);
    expect(mockRepo.save).not.toHaveBeenCalled();
    expect(mockPublisher.publish).not.toHaveBeenCalled();
  });
});
