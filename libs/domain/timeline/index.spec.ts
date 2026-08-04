import { describe, expect, it } from "vitest";
import {
  DomainValidationError,
  Event,
  EventStatus,
  createCharacterId,
  createEventId,
  createLocationId,
  createUniverseId,
  createUserId,
} from "./index.js";

describe("Event Aggregate (Timeline Domain)", () => {
  it("creates a valid Event aggregate with participants and location", () => {
    const event = Event.create({
      eventId: createEventId("evt_1"),
      universeId: createUniverseId("uni_1"),
      title: "Battle of Camlann",
      description: "The final battle of King Arthur where he fought Mordred.",
      locationId: createLocationId("loc_camlann"),
      status: EventStatus.CANON,
      participants: [
        { characterId: createCharacterId("char_arthur"), role: "PROTAGONIST" },
        { characterId: createCharacterId("char_mordred"), role: "ANTAGONIST" },
      ],
      createdBy: createUserId("usr_1"),
    });

    expect(event.eventId).toBe("evt_1");
    expect(event.universeId).toBe("uni_1");
    expect(event.title).toBe("Battle of Camlann");
    expect(event.locationId).toBe("loc_camlann");
    expect(event.status).toBe(EventStatus.CANON);
    expect(event.participants).toHaveLength(2);
    expect(event.participants[0]?.characterId).toBe("char_arthur");
    expect(event.participants[0]?.role).toBe("PROTAGONIST");
  });

  it("throws DomainValidationError when title is empty", () => {
    expect(() =>
      Event.create({
        eventId: createEventId("evt_err"),
        universeId: createUniverseId("uni_1"),
        title: "   ",
        description: "Valid description",
        createdBy: createUserId("usr_1"),
      }),
    ).toThrow(DomainValidationError);
  });

  it("throws DomainValidationError when description is empty", () => {
    expect(() =>
      Event.create({
        eventId: createEventId("evt_err_2"),
        universeId: createUniverseId("uni_1"),
        title: "Valid Title",
        description: "",
        createdBy: createUserId("usr_1"),
      }),
    ).toThrow(DomainValidationError);
  });
});
