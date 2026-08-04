export interface CreateCharacterCommand {
  characterId?: string;
  universeId: string;
  primaryName: string;
  createdBy: string;
}

export interface CharacterDTO {
  characterId: string;
  universeId: string;
  primaryName: string;
  status: string;
  canonStatus: string;
  createdBy: string;
  createdAt: string;
}
