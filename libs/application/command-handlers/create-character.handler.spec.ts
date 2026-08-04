import { DomainValidationError } from "@storyos/domain-character";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateCharacterCommandHandler } from "./create-character.handler.js";

describe("CreateCharacterCommandHandler", () => {
  let mockCharRepo: any;
  let mockUniverseRepo: any;
  let mockPublisher: any;
  let handler: CreateCharacterCommandHandler;

  beforeEach(() => {
    mockCharRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn().mockResolvedValue(null),
      findByUniverseId: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    mockUniverseRepo = {
      findById: vi.fn().mockResolvedValue({ universeId: "uni_valid_1" }),
    };

    mockPublisher = {
      publish: vi.fn().mockResolvedValue(undefined),
    };

    handler = new CreateCharacterCommandHandler(mockCharRepo, mockUniverseRepo, mockPublisher);
  });

  it("creates and saves a Character when Universe exists", async () => {
    const command = {
      characterId: "char_test_1",
      universeId: "uni_valid_1",
      primaryName: "Arthur Pendelton",
      createdBy: "usr_test_1",
    };

    const result = await handler.execute(command);

    expect(result.characterId).toBe("char_test_1");
    expect(result.universeId).toBe("uni_valid_1");
    expect(result.primaryName).toBe("Arthur Pendelton");
    expect(result.status).toBe("DRAFT");
    expect(result.canonStatus).toBe("DRAFT");

    expect(mockUniverseRepo.findById).toHaveBeenCalledWith("uni_valid_1");
    expect(mockCharRepo.save).toHaveBeenCalledTimes(1);
    expect(mockPublisher.publish).toHaveBeenCalledWith(
      "character-events",
      expect.objectContaining({
        eventType: "CharacterCreated",
        characterId: "char_test_1",
        universeId: "uni_valid_1",
        primaryName: "Arthur Pendelton",
      }),
    );
  });

  it("throws DomainValidationError when universeId does not exist", async () => {
    mockUniverseRepo.findById.mockResolvedValue(null);

    const command = {
      characterId: "char_test_1",
      universeId: "uni_nonexistent",
      primaryName: "Arthur Pendelton",
      createdBy: "usr_test_1",
    };

    await expect(handler.execute(command)).rejects.toThrow(DomainValidationError);
    expect(mockCharRepo.save).not.toHaveBeenCalled();
    expect(mockPublisher.publish).not.toHaveBeenCalled();
  });

  it("throws DomainValidationError if primaryName is empty", async () => {
    const command = {
      universeId: "uni_valid_1",
      primaryName: "",
      createdBy: "usr_test_1",
    };

    await expect(handler.execute(command)).rejects.toThrow(DomainValidationError);
    expect(mockCharRepo.save).not.toHaveBeenCalled();
  });
});
