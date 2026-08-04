import {
  Relationship,
  RelationshipType,
  createCharacterId,
  createRelationshipId,
  createUniverseId,
  createUserId,
} from "@storyos/domain-relationship";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetRelationshipQueryHandler } from "./get-relationship.handler.js";

describe("GetRelationshipQueryHandler", () => {
  let mockRelRepo: any;
  let handler: GetRelationshipQueryHandler;

  beforeEach(() => {
    mockRelRepo = {
      findById: vi.fn(),
      findByCharacterId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    handler = new GetRelationshipQueryHandler(mockRelRepo);
  });

  it("returns RelationshipDTO when relationship is found", async () => {
    const mockRel = Relationship.create({
      relationshipId: createRelationshipId("rel_found_1"),
      universeId: createUniverseId("uni_1"),
      sourceCharacterId: createCharacterId("char_1"),
      targetCharacterId: createCharacterId("char_2"),
      relationshipType: RelationshipType.MENTOR,
      createdBy: createUserId("usr_1"),
    });

    mockRelRepo.findById.mockResolvedValue(mockRel);

    const result = await handler.execute({ relationshipId: "rel_found_1" });

    expect(result).not.toBeNull();
    expect(result?.relationshipId).toBe("rel_found_1");
    expect(result?.relationshipType).toBe("MENTOR");
  });

  it("returns null when relationship is not found", async () => {
    mockRelRepo.findById.mockResolvedValue(null);

    const result = await handler.execute({ relationshipId: "rel_missing" });

    expect(result).toBeNull();
  });
});
