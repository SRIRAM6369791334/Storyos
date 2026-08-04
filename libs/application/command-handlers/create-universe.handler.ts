import {
  type AudienceClassification,
  type GenreClassification,
  type IEventPublisher,
  type MaturityRating,
  type MediumType,
  StoryUniverse,
  type UniverseCreatedEvent,
  type UniverseRepository,
  UniverseSynopsis,
  UniverseTitle,
  createOrganizationId,
  createUniverseId,
  createUserId,
} from "@storyos/domain-universe";
import type { CreateUniverseCommand, UniverseDTO } from "../use-cases/create-universe.command.js";

export class CreateUniverseCommandHandler {
  private repository: UniverseRepository;
  private eventPublisher?: IEventPublisher;

  constructor(repository: UniverseRepository, eventPublisher?: IEventPublisher) {
    this.repository = repository;
    this.eventPublisher = eventPublisher;
  }

  public async execute(command: CreateUniverseCommand): Promise<UniverseDTO> {
    const universeIdStr =
      command.universeId && command.universeId.trim().length > 0
        ? command.universeId
        : `uni_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const universeId = createUniverseId(universeIdStr);
    const organizationId = createOrganizationId(command.organizationId);
    const createdBy = createUserId(command.createdBy);
    const title = UniverseTitle.create(command.title);

    const synopsis = command.synopsis ? UniverseSynopsis.create(command.synopsis) : undefined;
    const genres = (command.genre || []).map((g) => g as GenreClassification);
    const primaryMedium = command.primaryMedium ? (command.primaryMedium as MediumType) : undefined;
    const targetAudience = command.targetAudience
      ? (command.targetAudience as AudienceClassification)
      : undefined;
    const maturityRating = command.maturityRating
      ? (command.maturityRating as MaturityRating)
      : undefined;

    const universe = StoryUniverse.create({
      universeId,
      organizationId,
      title,
      createdBy,
      synopsis,
      genre: genres,
      primaryMedium,
      targetAudience,
      maturityRating,
    });

    await this.repository.save(universe);

    if (this.eventPublisher) {
      const event: UniverseCreatedEvent = {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        eventType: "UniverseCreated",
        universeId: universe.universeId,
        organizationId: universe.organizationId,
        title: universe.title.toString(),
        createdBy: universe.createdBy,
        createdAt: universe.createdAt.toISOString(),
      };
      await this.eventPublisher.publish(
        "universe-events",
        event as unknown as Record<string, unknown>,
      );
    }

    return {
      universeId: universe.universeId,
      organizationId: universe.organizationId,
      title: universe.title.toString(),
      status: universe.status,
      createdBy: universe.createdBy,
      createdAt: universe.createdAt.toISOString(),
      synopsis: universe.synopsis?.toString(),
      genre: universe.genre,
      primaryMedium: universe.primaryMedium,
      targetAudience: universe.targetAudience,
      maturityRating: universe.maturityRating,
      linkedUniverseIds: universe.linkedUniverseIds,
      archivedAt: universe.archivedAt?.toISOString(),
      archivedBy: universe.archivedBy,
    };
  }
}
