import { type EventRepository, createUniverseId } from "@storyos/domain-timeline";
import type { EventDTO } from "../use-cases/create-event.command.js";
import type { ListEventsByUniverseQuery } from "../use-cases/list-events-by-universe.query.js";

export class ListEventsByUniverseQueryHandler {
  private eventRepo: EventRepository;

  constructor(eventRepo: EventRepository) {
    this.eventRepo = eventRepo;
  }

  public async execute(query: ListEventsByUniverseQuery): Promise<EventDTO[]> {
    const universeId = createUniverseId(query.universeId);
    const events = await this.eventRepo.findByUniverseId(universeId);

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
