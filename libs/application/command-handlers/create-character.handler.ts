import {
  Character,
  type CharacterCreatedEvent,
  CharacterName,
  type CharacterRepository,
  DomainValidationError,
  createCharacterId,
  createUniverseId,
  createUserId,
} from "@storyos/domain-character";
import type { UniverseRepository } from "@storyos/domain-universe";
import type { IEventPublisher } from "@storyos/domain-universe";
import type {
  CharacterDTO,
  CreateCharacterCommand,
} from "../use-cases/create-character.command.js";

export class CreateCharacterCommandHandler {
  private characterRepo: CharacterRepository;
  private universeRepo: UniverseRepository;
  private eventPublisher?: IEventPublisher;

  constructor(
    characterRepo: CharacterRepository,
    universeRepo: UniverseRepository,
    eventPublisher?: IEventPublisher,
  ) {
    this.characterRepo = characterRepo;
    this.universeRepo = universeRepo;
    this.eventPublisher = eventPublisher;
  }

  public async execute(command: CreateCharacterCommand): Promise<CharacterDTO> {
    const universeId = createUniverseId(command.universeId);

    // Validate Universe existence (structural relationship check)
    const universeExists = await this.universeRepo.findById(universeId);
    if (!universeExists) {
      throw new DomainValidationError(
        "universeId",
        "NOT_FOUND",
        `Universe with ID '${command.universeId}' does not exist`,
      );
    }

    const charIdStr =
      command.characterId && command.characterId.trim().length > 0
        ? command.characterId
        : `char_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const characterId = createCharacterId(charIdStr);
    const primaryName = CharacterName.create(command.primaryName);
    const createdBy = createUserId(command.createdBy);

    const character = Character.create({
      characterId,
      universeId,
      primaryName,
      createdBy,
    });

    await this.characterRepo.save(character);

    if (this.eventPublisher) {
      const event: CharacterCreatedEvent = {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        eventType: "CharacterCreated",
        characterId: character.characterId,
        universeId: character.universeId,
        primaryName: character.primaryName.toString(),
        createdBy: character.createdBy,
        createdAt: character.createdAt.toISOString(),
      };
      await this.eventPublisher.publish(
        "character-events",
        event as unknown as Record<string, unknown>,
      );
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
