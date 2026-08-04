import type { CharacterRepository } from "@storyos/domain-character";
import {
  DomainValidationError,
  Event,
  type EventCreatedEvent,
  type EventParticipant,
  type EventRepository,
  EventStatus,
  createCharacterId,
  createEventId,
  createLocationId,
  createUniverseId,
  createUserId,
} from "@storyos/domain-timeline";
import type { IEventPublisher, UniverseRepository } from "@storyos/domain-universe";
import type { LocationRepository } from "@storyos/domain-world-building";
import type { CreateEventCommand, EventDTO } from "../use-cases/create-event.command.js";

export class CreateEventCommandHandler {
  private eventRepo: EventRepository;
  private universeRepo: UniverseRepository;
  private characterRepo: CharacterRepository;
  private locationRepo: LocationRepository;
  private eventPublisher?: IEventPublisher;

  constructor(
    eventRepo: EventRepository,
    universeRepo: UniverseRepository,
    characterRepo: CharacterRepository,
    locationRepo: LocationRepository,
    eventPublisher?: IEventPublisher,
  ) {
    this.eventRepo = eventRepo;
    this.universeRepo = universeRepo;
    this.characterRepo = characterRepo;
    this.locationRepo = locationRepo;
    this.eventPublisher = eventPublisher;
  }

  public async execute(command: CreateEventCommand): Promise<EventDTO> {
    // 1. Validate parent Universe existence
    const univId = createUniverseId(command.universeId);
    const universe = await this.universeRepo.findById(univId as any);

    if (!universe) {
      throw new DomainValidationError(
        "universeId",
        "NOT_FOUND",
        `Universe with ID '${command.universeId}' does not exist`,
      );
    }

    // 2. Validate locationId if provided
    let locationIdObj = undefined;
    if (command.locationId && command.locationId.trim().length > 0) {
      const locId = createLocationId(command.locationId);
      const location = await this.locationRepo.findById(locId as any);

      if (!location) {
        throw new DomainValidationError(
          "locationId",
          "NOT_FOUND",
          `Location with ID '${command.locationId}' does not exist`,
        );
      }

      if (location.universeId !== command.universeId) {
        throw new DomainValidationError(
          "locationId",
          "CROSS_UNIVERSE_PROHIBITED",
          `Location '${command.locationId}' belongs to a different universe`,
        );
      }

      locationIdObj = locId;
    }

    // 3. Validate participant characters
    const parsedParticipants: EventParticipant[] = [];

    if (command.participants && command.participants.length > 0) {
      for (const p of command.participants) {
        const charId = createCharacterId(p.characterId);
        const character = await this.characterRepo.findById(charId as any);

        if (!character) {
          throw new DomainValidationError(
            "participantCharacterId",
            "NOT_FOUND",
            `Participant character with ID '${p.characterId}' does not exist`,
          );
        }

        if (character.universeId !== command.universeId) {
          throw new DomainValidationError(
            "participantCharacterId",
            "CROSS_UNIVERSE_PROHIBITED",
            `Participant character '${p.characterId}' belongs to a different universe`,
          );
        }

        parsedParticipants.push({
          characterId: charId,
          role: p.role,
        });
      }
    }

    // 4. Validate EventStatus enum
    let statusEnum = EventStatus.CANON;
    if (command.status) {
      const validStatuses = Object.values(EventStatus) as string[];
      if (!validStatuses.includes(command.status)) {
        throw new DomainValidationError(
          "status",
          "INVALID_ENUM_VALUE",
          `Invalid status '${command.status}'. Must be one of: ${validStatuses.join(", ")}`,
        );
      }
      statusEnum = command.status as EventStatus;
    }

    // 5. Create Event aggregate
    const evtIdStr =
      command.eventId && command.eventId.trim().length > 0
        ? command.eventId
        : `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const eventId = createEventId(evtIdStr);
    const createdBy = createUserId(command.createdBy);

    const event = Event.create({
      eventId,
      universeId: univId,
      title: command.title,
      description: command.description,
      locationId: locationIdObj,
      status: statusEnum,
      participants: parsedParticipants,
      createdBy,
    });

    // 6. Save Event aggregate to Postgres
    await this.eventRepo.save(event);

    // 7. Publish domain event to Kafka
    if (this.eventPublisher) {
      const kafkaEvent: EventCreatedEvent = {
        eventId: event.eventId,
        eventType: "EventCreated",
        universeId: event.universeId,
        title: event.title,
        description: event.description,
        locationId: event.locationId,
        status: event.status,
        participants: event.participants.map((p) => ({
          characterId: p.characterId,
          role: p.role,
        })),
        createdBy: event.createdBy,
        createdAt: event.createdAt.toISOString(),
      };

      await this.eventPublisher.publish(
        "timeline-events",
        kafkaEvent as unknown as Record<string, unknown>,
      );
    }

    return {
      eventId: event.eventId,
      universeId: event.universeId,
      title: event.title,
      description: event.description,
      locationId: event.locationId,
      status: event.status,
      participants: event.participants.map((p) => ({
        characterId: p.characterId,
        role: p.role,
      })),
      createdBy: event.createdBy,
      createdAt: event.createdAt.toISOString(),
    };
  }
}
