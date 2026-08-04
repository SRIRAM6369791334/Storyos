import { type EventRepository, createEventId } from "@storyos/domain-timeline";
import type { EventDTO } from "../use-cases/create-event.command.js";
import type { GetEventQuery } from "../use-cases/get-event.query.js";

export class GetEventQueryHandler {
  private eventRepo: EventRepository;

  constructor(eventRepo: EventRepository) {
    this.eventRepo = eventRepo;
  }

  public async execute(query: GetEventQuery): Promise<EventDTO | null> {
    const eventId = createEventId(query.eventId);
    const event = await this.eventRepo.findById(eventId);

    if (!event) {
      return null;
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
