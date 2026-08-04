import { type EventRepository, createCharacterId } from "@storyos/domain-timeline";
import type { EventDTO } from "../use-cases/create-event.command.js";
import type { ListEventsByCharacterQuery } from "../use-cases/list-events-by-character.query.js";

export class ListEventsByCharacterQueryHandler {
  private eventRepo: EventRepository;

  constructor(eventRepo: EventRepository) {
    this.eventRepo = eventRepo;
  }

  public async execute(query: ListEventsByCharacterQuery): Promise<EventDTO[]> {
    const charId = createCharacterId(query.characterId);
    const events = await this.eventRepo.findByCharacterId(charId);

    return events.map((event) => ({
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
    }));
  }
}
