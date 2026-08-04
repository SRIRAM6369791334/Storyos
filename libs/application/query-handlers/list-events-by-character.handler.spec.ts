import {
  Event,
  EventStatus,
  createCharacterId,
  createEventId,
  createUniverseId,
  createUserId,
} from "@storyos/domain-timeline";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListEventsByCharacterQueryHandler } from "./list-events-by-character.handler.js";

describe("ListEventsByCharacterQueryHandler", () => {
  let mockEventRepo: any;
  let handler: ListEventsByCharacterQueryHandler;

  beforeEach(() => {
    mockEventRepo = {
      findById: vi.fn(),
      findByUniverseId: vi.fn(),
      findByCharacterId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    handler = new ListEventsByCharacterQueryHandler(mockEventRepo);
  });

  it("returns list of EventDTOs for events a given character participated in", async () => {
    mockEventRepo.findByCharacterId.mockResolvedValue([
      Event.create({
        eventId: createEventId("evt_1"),
        universeId: createUniverseId("uni_1"),
        title: "Pulling Sword from Stone",
        description: "Arthur draws Caliburn.",
        status: EventStatus.CANON,
        participants: [{ characterId: createCharacterId("char_arthur"), role: "PROTAGONIST" }],
        createdBy: createUserId("usr_1"),
      }),
    ]);

    const result = await handler.execute({ characterId: "char_arthur" });

    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Pulling Sword from Stone");
    expect(mockEventRepo.findByCharacterId).toHaveBeenCalledWith("char_arthur");
  });
});
