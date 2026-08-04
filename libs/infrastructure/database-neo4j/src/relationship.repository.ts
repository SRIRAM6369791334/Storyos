import {
  type CanonStatus,
  type CharacterId,
  DomainValidationError,
  Relationship,
  type RelationshipDirection,
  type RelationshipId,
  type RelationshipRepository,
  type RelationshipStatus,
  RelationshipType,
  createCharacterId,
  createRelationshipId,
  createUniverseId,
  createUserId,
} from "@storyos/domain-relationship";
import type { Neo4jClient } from "../index.js";

export class Neo4jRelationshipRepository implements RelationshipRepository {
  private neo4jClient: Neo4jClient;

  constructor(neo4jClient: Neo4jClient) {
    this.neo4jClient = neo4jClient;
  }

  private validateRelationshipType(relTypeStr: string): RelationshipType {
    const validValues = Object.values(RelationshipType) as string[];
    if (!validValues.includes(relTypeStr)) {
      throw new DomainValidationError(
        "relationshipType",
        "INVALID_ENUM_VALUE",
        `Invalid relationshipType '${relTypeStr}'. Must be one of valid RelationshipType enum values.`,
      );
    }
    return relTypeStr as RelationshipType;
  }

  public async save(relationship: Relationship): Promise<void> {
    const validatedType = this.validateRelationshipType(relationship.relationshipType);
    const session = this.neo4jClient.getDriver().session();

    try {
      const cypher = `
        MERGE (source:Character {id: $sourceId})
          ON CREATE SET source.universeId = $universeId
        MERGE (target:Character {id: $targetId})
          ON CREATE SET target.universeId = $universeId
        MERGE (source)-[r:${validatedType} {id: $id}]->(target)
        SET r.universeId = $universeId,
            r.relationshipType = $relationshipType,
            r.direction = $direction,
            r.status = $status,
            r.canonStatus = $canonStatus,
            r.createdBy = $createdBy,
            r.createdAt = $createdAt
      `;

      await session.executeWrite((tx) =>
        tx.run(cypher, {
          id: relationship.relationshipId,
          universeId: relationship.universeId,
          sourceId: relationship.sourceCharacterId,
          targetId: relationship.targetCharacterId,
          relationshipType: relationship.relationshipType,
          direction: relationship.direction,
          status: relationship.status,
          canonStatus: relationship.canonStatus,
          createdBy: relationship.createdBy,
          createdAt: relationship.createdAt.toISOString(),
        }),
      );
    } finally {
      await session.close();
    }
  }

  public async findById(relationshipId: RelationshipId): Promise<Relationship | null> {
    const session = this.neo4jClient.getDriver().session();

    try {
      const cypher = `
        MATCH (s:Character)-[r {id: $id}]->(t:Character)
        RETURN r.id AS id,
               r.universeId AS universeId,
               s.id AS sourceCharacterId,
               t.id AS targetCharacterId,
               r.relationshipType AS relationshipType,
               r.direction AS direction,
               r.status AS status,
               r.canonStatus AS canonStatus,
               r.createdBy AS createdBy
      `;

      const result = await session.executeRead((tx) => tx.run(cypher, { id: relationshipId }));
      if (result.records.length === 0) {
        return null;
      }

      const rec = result.records[0];
      if (!rec) return null;

      const relTypeStr = rec.get("relationshipType");
      const validatedType = this.validateRelationshipType(relTypeStr);

      return Relationship.create({
        relationshipId: createRelationshipId(rec.get("id")),
        universeId: createUniverseId(rec.get("universeId")),
        sourceCharacterId: createCharacterId(rec.get("sourceCharacterId")),
        targetCharacterId: createCharacterId(rec.get("targetCharacterId")),
        relationshipType: validatedType,
        direction: rec.get("direction") as RelationshipDirection,
        status: rec.get("status") as RelationshipStatus,
        canonStatus: rec.get("canonStatus") as CanonStatus,
        createdBy: createUserId(rec.get("createdBy")),
      });
    } finally {
      await session.close();
    }
  }

  public async findByCharacterId(characterId: CharacterId): Promise<Relationship[]> {
    const session = this.neo4jClient.getDriver().session();

    try {
      const cypher = `
        MATCH (c:Character {id: $characterId})-[r]-(other:Character)
        MATCH (s:Character)-[r]->(t:Character)
        RETURN DISTINCT r.id AS id,
               r.universeId AS universeId,
               s.id AS sourceCharacterId,
               t.id AS targetCharacterId,
               r.relationshipType AS relationshipType,
               r.direction AS direction,
               r.status AS status,
               r.canonStatus AS canonStatus,
               r.createdBy AS createdBy
      `;

      const result = await session.executeRead((tx) => tx.run(cypher, { characterId }));

      return result.records.map((rec) => {
        const relTypeStr = rec.get("relationshipType");
        const validatedType = this.validateRelationshipType(relTypeStr);

        return Relationship.create({
          relationshipId: createRelationshipId(rec.get("id")),
          universeId: createUniverseId(rec.get("universeId")),
          sourceCharacterId: createCharacterId(rec.get("sourceCharacterId")),
          targetCharacterId: createCharacterId(rec.get("targetCharacterId")),
          relationshipType: validatedType,
          direction: rec.get("direction") as RelationshipDirection,
          status: rec.get("status") as RelationshipStatus,
          canonStatus: rec.get("canonStatus") as CanonStatus,
          createdBy: createUserId(rec.get("createdBy")),
        });
      });
    } finally {
      await session.close();
    }
  }

  public async delete(relationshipId: RelationshipId): Promise<void> {
    const session = this.neo4jClient.getDriver().session();

    try {
      const cypher = `
        MATCH ()-[r {id: $id}]->()
        DELETE r
      `;

      await session.executeWrite((tx) => tx.run(cypher, { id: relationshipId }));
    } finally {
      await session.close();
    }
  }
}
