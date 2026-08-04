export interface CreateRelationshipCommand {
  relationshipId?: string;
  universeId: string;
  sourceCharacterId: string;
  targetCharacterId: string;
  relationshipType: string;
  direction?: string;
  createdBy: string;
}

export interface RelationshipDTO {
  relationshipId: string;
  universeId: string;
  sourceCharacterId: string;
  targetCharacterId: string;
  relationshipType: string;
  direction: string;
  status: string;
  canonStatus: string;
  createdBy: string;
  createdAt: string;
}
