import { type RelationshipRepository, createRelationshipId } from "@storyos/domain-relationship";
import type { RelationshipDTO } from "../use-cases/create-relationship.command.js";
import type { GetRelationshipQuery } from "../use-cases/get-relationship.query.js";

export class GetRelationshipQueryHandler {
  private relationshipRepo: RelationshipRepository;

  constructor(relationshipRepo: RelationshipRepository) {
    this.relationshipRepo = relationshipRepo;
  }

  public async execute(query: GetRelationshipQuery): Promise<RelationshipDTO | null> {
    const relId = createRelationshipId(query.relationshipId);
    const rel = await this.relationshipRepo.findById(relId);

    if (!rel) {
      return null;
    }

    return {
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
    };
  }
}
