import {
  Event,
  EventStatus,
  createEventId,
  createUniverseId,
  createUserId,
} from "@storyos/domain-timeline";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetEventQueryHandler } from "./get-event.handler.js";

describe("GetEventQueryHandler", () => {
  let mockEventRepo: any;
  let handler: GetEventQueryHandler;

  beforeEach(() => {
    mockEventRepo = {
      findById: vi.fn(),
      findByUniverseId: vi.fn(),
      findByCharacterId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    handler = new GetEventQueryHandler(mockEventRepo);
  });

  it("returns EventDTO when event exists", async () => {
    const mockEvent = Event.create({
      eventId: createEventId("evt_found_1"),
      universeId: createUniverseId("uni_1"),
      title: "Coronation of Arthur",
      description: "King Arthur takes the crown at Camelot.",
      status: EventStatus.CANON,
      createdBy: createUserId("usr_1"),
    });

    mockEventRepo.findById.mockResolvedValue(mockEvent);

    const result = await handler.execute({ eventId: "evt_found_1" });

    expect(result).not.toBeNull();
    expect(result?.eventId).toBe("evt_found_1");
    expect(result?.title).toBe("Coronation of Arthur");
  });

  it("returns null when event is not found", async () => {
    mockEventRepo.findById.mockResolvedValue(null);

    const result = await handler.execute({ eventId: "evt_missing" });

    expect(result).toBeNull();
  });
});
