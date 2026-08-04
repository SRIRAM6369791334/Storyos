import { type CharacterRepository, createCharacterId } from "@storyos/domain-character";
import type { CharacterDTO } from "../use-cases/create-character.command.js";
import type { GetCharacterQuery } from "../use-cases/get-character.query.js";

export class GetCharacterQueryHandler {
  private characterRepo: CharacterRepository;

  constructor(characterRepo: CharacterRepository) {
    this.characterRepo = characterRepo;
  }

  public async execute(query: GetCharacterQuery): Promise<CharacterDTO | null> {
    const characterId = createCharacterId(query.characterId);
    const character = await this.characterRepo.findById(characterId);

    if (!character) {
      return null;
    }

    return {
      characterId: character.characterId,
      universeId: character.universeId,
      primaryName: character.primaryName.toString(),
      status: character.status,
      canonStatus: character.canonStatus,
      createdBy: character.createdBy,
      createdAt: character.createdAt.toISOString(),
    };
  }
}
