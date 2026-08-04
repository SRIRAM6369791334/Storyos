import {
  Relationship,
  RelationshipType,
  createCharacterId,
  createRelationshipId,
  createUniverseId,
  createUserId,
} from "@storyos/domain-relationship";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListRelationshipsByCharacterQueryHandler } from "./list-relationships-by-character.handler.js";

describe("ListRelationshipsByCharacterQueryHandler", () => {
  let mockRelRepo: any;
  let handler: ListRelationshipsByCharacterQueryHandler;

  beforeEach(() => {
    mockRelRepo = {
      findById: vi.fn(),
      findByCharacterId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    handler = new ListRelationshipsByCharacterQueryHandler(mockRelRepo);
  });

  it("returns list of RelationshipDTOs involving a given characterId", async () => {
    mockRelRepo.findByCharacterId.mockResolvedValue([
      Relationship.create({
        relationshipId: createRelationshipId("rel_1"),
        universeId: createUniverseId("uni_1"),
        sourceCharacterId: createCharacterId("char_arthur"),
        targetCharacterId: createCharacterId("char_lancelot"),
        relationshipType: RelationshipType.ALLY,
        createdBy: createUserId("usr_1"),
      }),
      Relationship.create({
        relationshipId: createRelationshipId("rel_2"),
        universeId: createUniverseId("uni_1"),
        sourceCharacterId: createCharacterId("char_merlin"),
        targetCharacterId: createCharacterId("char_arthur"),
        relationshipType: RelationshipType.MENTOR,
        createdBy: createUserId("usr_1"),
      }),
    ]);

    const result = await handler.execute({ characterId: "char_arthur" });

    expect(result).toHaveLength(2);
    expect(result[0]?.relationshipId).toBe("rel_1");
    expect(result[1]?.relationshipId).toBe("rel_2");
    expect(mockRelRepo.findByCharacterId).toHaveBeenCalledWith("char_arthur");
  });
});
