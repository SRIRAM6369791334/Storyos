import { type CharacterRepository, createUniverseId } from "@storyos/domain-character";
import type { CharacterDTO } from "../use-cases/create-character.command.js";
import type { ListCharactersByUniverseQuery } from "../use-cases/list-characters-by-universe.query.js";

export class ListCharactersByUniverseQueryHandler {
  private characterRepo: CharacterRepository;

  constructor(characterRepo: CharacterRepository) {
    this.characterRepo = characterRepo;
  }

  public async execute(query: ListCharactersByUniverseQuery): Promise<CharacterDTO[]> {
    const universeId = createUniverseId(query.universeId);
    const characters = await this.characterRepo.findByUniverseId(universeId);

    return characters.map((char) => ({
      characterId: char.characterId,
      universeId: char.universeId,
      primaryName: char.primaryName.toString(),
      status: char.status,
      canonStatus: char.canonStatus,
      createdBy: char.createdBy,
      createdAt: char.createdAt.toISOString(),
    }));
  }
}
