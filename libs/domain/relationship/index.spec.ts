import { describe, expect, it } from "vitest";
import {
  CanonStatus,
  DomainValidationError,
  Relationship,
  RelationshipDirection,
  RelationshipStatus,
  RelationshipType,
  createCharacterId,
  createRelationshipId,
  createUniverseId,
  createUserId,
} from "./index.js";

describe("Relationship Aggregate (Relationship Domain)", () => {
  it("creates a valid Relationship aggregate", () => {
    const rel = Relationship.create({
      relationshipId: createRelationshipId("rel_1"),
      universeId: createUniverseId("uni_1"),
      sourceCharacterId: createCharacterId("char_1"),
      targetCharacterId: createCharacterId("char_2"),
      relationshipType: RelationshipType.ALLY,
      createdBy: createUserId("usr_1"),
    });

    expect(rel.relationshipId).toBe("rel_1");
    expect(rel.universeId).toBe("uni_1");
    expect(rel.sourceCharacterId).toBe("char_1");
    expect(rel.targetCharacterId).toBe("char_2");
    expect(rel.relationshipType).toBe(RelationshipType.ALLY);
    expect(rel.direction).toBe(RelationshipDirection.DIRECTED);
    expect(rel.status).toBe(RelationshipStatus.ACTIVE);
    expect(rel.canonStatus).toBe(CanonStatus.DRAFT);
  });

  it("throws DomainValidationError when sourceCharacterId === targetCharacterId", () => {
    expect(() =>
      Relationship.create({
        relationshipId: createRelationshipId("rel_self"),
        universeId: createUniverseId("uni_1"),
        sourceCharacterId: createCharacterId("char_same"),
        targetCharacterId: createCharacterId("char_same"),
        relationshipType: RelationshipType.ALLY,
        createdBy: createUserId("usr_1"),
      }),
    ).toThrow(DomainValidationError);
  });
});
