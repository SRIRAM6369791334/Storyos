import { type RelationshipRepository, createCharacterId } from "@storyos/domain-relationship";
import type { RelationshipDTO } from "../use-cases/create-relationship.command.js";
import type { ListRelationshipsByCharacterQuery } from "../use-cases/list-relationships-by-character.query.js";

export class ListRelationshipsByCharacterQueryHandler {
  private relationshipRepo: RelationshipRepository;

  constructor(relationshipRepo: RelationshipRepository) {
    this.relationshipRepo = relationshipRepo;
  }

  public async execute(query: ListRelationshipsByCharacterQuery): Promise<RelationshipDTO[]> {
    const charId = createCharacterId(query.characterId);
    const relationships = await this.relationshipRepo.findByCharacterId(charId);

    return relationships.map((rel) => ({
      relationshipId: rel.relationshipId,
      universeId: rel.universeId,
      sourceCharacterId: rel.sourceCharacterId,
      targetCharacterId: rel.targetCharacterId,
      relationshipType: rel.relationshipType,
      direction: rel.direction,
      status: rel.status,
      canonStatus: rel.canonStatus,
      createdBy: rel.createdBy,
      createdAt: rel.createdAt.toISOString(),
    }));
  }
}
