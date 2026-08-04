import {
  Event,
  EventStatus,
  createEventId,
  createUniverseId,
  createUserId,
} from "@storyos/domain-timeline";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListEventsByUniverseQueryHandler } from "./list-events-by-universe.handler.js";

describe("ListEventsByUniverseQueryHandler", () => {
  let mockEventRepo: any;
  let handler: ListEventsByUniverseQueryHandler;

  beforeEach(() => {
    mockEventRepo = {
      findById: vi.fn(),
      findByUniverseId: vi.fn(),
      findByCharacterId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    handler = new ListEventsByUniverseQueryHandler(mockEventRepo);
  });

  it("returns list of EventDTOs for a given universeId", async () => {
    mockEventRepo.findByUniverseId.mockResolvedValue([
      Event.create({
        eventId: createEventId("evt_1"),
        universeId: createUniverseId("uni_1"),
        title: "Event 1",
        description: "Description 1",
        status: EventStatus.CANON,
        createdBy: createUserId("usr_1"),
      }),
      Event.create({
        eventId: createEventId("evt_2"),
        universeId: createUniverseId("uni_1"),
        title: "Event 2",
        description: "Description 2",
        status: EventStatus.RUMORED,
        createdBy: createUserId("usr_1"),
      }),
    ]);

    const result = await handler.execute({ universeId: "uni_1" });

    expect(result).toHaveLength(2);
    expect(result[0]?.title).toBe("Event 1");
    expect(result[1]?.title).toBe("Event 2");
  });
});
