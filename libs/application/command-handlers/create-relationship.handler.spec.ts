import { DomainValidationError } from "@storyos/domain-relationship";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateRelationshipCommandHandler } from "./create-relationship.handler.js";

describe("CreateRelationshipCommandHandler", () => {
  let mockRelRepo: any;
  let mockCharRepo: any;
  let mockPublisher: any;
  let handler: CreateRelationshipCommandHandler;

  beforeEach(() => {
    mockRelRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn().mockResolvedValue(null),
      findByCharacterId: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    mockCharRepo = {
      findById: vi.fn().mockImplementation((id: string) => {
        if (id === "char_source_1" || id === "char_target_1") {
          return Promise.resolve({ characterId: id, universeId: "uni_1" });
        }
        if (id === "char_other_univ") {
          return Promise.resolve({ characterId: id, universeId: "uni_2" });
        }
        return Promise.resolve(null);
      }),
    };

    mockPublisher = {
      publish: vi.fn().mockResolvedValue(undefined),
    };

    handler = new CreateRelationshipCommandHandler(mockRelRepo, mockCharRepo, mockPublisher);
  });

  it("rejects invalid/unknown relationshipType BEFORE any repository or Cypher execution", async () => {
    const command = {
      relationshipId: "rel_invalid",
      universeId: "uni_1",
      sourceCharacterId: "char_source_1",
      targetCharacterId: "char_target_1",
      relationshipType: "INVALID_LABEL_CYPHER_INJECTION'; MATCH (n) DETACH DELETE n; //",
      createdBy: "usr_1",
    };

    const err = await handler.execute(command).catch((e) => e);
    expect(err).toBeInstanceOf(DomainValidationError);
    expect(err.field).toBe("relationshipType");
    expect(err.rule).toBe("INVALID_ENUM_VALUE");

    expect(mockCharRepo.findById).not.toHaveBeenCalled();
    expect(mockRelRepo.save).not.toHaveBeenCalled();
  });

  it("creates and saves Relationship when both characters exist in same universe", async () => {
    const command = {
      relationshipId: "rel_valid_1",
      universeId: "uni_1",
      sourceCharacterId: "char_source_1",
      targetCharacterId: "char_target_1",
      relationshipType: "ALLY",
      createdBy: "usr_1",
    };

    const result = await handler.execute(command);

    expect(result.relationshipId).toBe("rel_valid_1");
    expect(result.sourceCharacterId).toBe("char_source_1");
    expect(result.targetCharacterId).toBe("char_target_1");
    expect(result.relationshipType).toBe("ALLY");

    expect(mockCharRepo.findById).toHaveBeenCalledWith("char_source_1");
    expect(mockCharRepo.findById).toHaveBeenCalledWith("char_target_1");
    expect(mockRelRepo.save).toHaveBeenCalledTimes(1);
    expect(mockPublisher.publish).toHaveBeenCalledWith(
      "relationship-events",
      expect.objectContaining({
        eventType: "RelationshipCreated",
        relationshipId: "rel_valid_1",
        relationshipType: "ALLY",
      }),
    );
  });

  it("throws DomainValidationError when sourceCharacterId does not exist in Postgres", async () => {
    const command = {
      universeId: "uni_1",
      sourceCharacterId: "char_missing",
      targetCharacterId: "char_target_1",
      relationshipType: "ALLY",
      createdBy: "usr_1",
    };

    const err = await handler.execute(command).catch((e) => e);
    expect(err).toBeInstanceOf(DomainValidationError);
    expect(err.field).toBe("sourceCharacterId");
    expect(err.rule).toBe("NOT_FOUND");
    expect(mockRelRepo.save).not.toHaveBeenCalled();
  });

  it("throws DomainValidationError when targetCharacterId does not exist in Postgres", async () => {
    const command = {
      universeId: "uni_1",
      sourceCharacterId: "char_source_1",
      targetCharacterId: "char_missing",
      relationshipType: "ALLY",
      createdBy: "usr_1",
    };

    const err = await handler.execute(command).catch((e) => e);
    expect(err).toBeInstanceOf(DomainValidationError);
    expect(err.field).toBe("targetCharacterId");
    expect(err.rule).toBe("NOT_FOUND");
    expect(mockRelRepo.save).not.toHaveBeenCalled();
  });

  it("throws DomainValidationError when characters belong to different universes", async () => {
    const command = {
      universeId: "uni_1",
      sourceCharacterId: "char_source_1",
      targetCharacterId: "char_other_univ",
      relationshipType: "ENEMY",
      createdBy: "usr_1",
    };

    const err = await handler.execute(command).catch((e) => e);
    expect(err).toBeInstanceOf(DomainValidationError);
    expect(err.field).toBe("targetCharacterId");
    expect(err.rule).toBe("CROSS_UNIVERSE_PROHIBITED");
    expect(mockRelRepo.save).not.toHaveBeenCalled();
  });
});
