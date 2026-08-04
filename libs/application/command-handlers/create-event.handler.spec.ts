import { DomainValidationError } from "@storyos/domain-timeline";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateEventCommandHandler } from "./create-event.handler.js";

describe("CreateEventCommandHandler", () => {
  let mockEventRepo: any;
  let mockUniverseRepo: any;
  let mockCharacterRepo: any;
  let mockLocationRepo: any;
  let mockPublisher: any;
  let handler: CreateEventCommandHandler;

  beforeEach(() => {
    mockEventRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn().mockResolvedValue(null),
      findByUniverseId: vi.fn().mockResolvedValue([]),
      findByCharacterId: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    mockUniverseRepo = {
      findById: vi.fn().mockImplementation((id: string) => {
        if (id === "uni_1") return Promise.resolve({ universeId: id });
        return Promise.resolve(null);
      }),
    };

    mockCharacterRepo = {
      findById: vi.fn().mockImplementation((id: string) => {
        if (id === "char_arthur" || id === "char_mordred") {
          return Promise.resolve({ characterId: id, universeId: "uni_1" });
        }
        if (id === "char_other_univ") {
          return Promise.resolve({ characterId: id, universeId: "uni_2" });
        }
        return Promise.resolve(null);
      }),
    };

    mockLocationRepo = {
      findById: vi.fn().mockImplementation((id: string) => {
        if (id === "loc_camlann") {
          return Promise.resolve({ locationId: id, universeId: "uni_1" });
        }
        if (id === "loc_other_univ") {
          return Promise.resolve({ locationId: id, universeId: "uni_2" });
        }
        return Promise.resolve(null);
      }),
    };

    mockPublisher = {
      publish: vi.fn().mockResolvedValue(undefined),
    };

    handler = new CreateEventCommandHandler(
      mockEventRepo,
      mockUniverseRepo,
      mockCharacterRepo,
      mockLocationRepo,
      mockPublisher,
    );
  });

  it("creates and saves Event when universe, location, and participants exist in same universe", async () => {
    const command = {
      eventId: "evt_camlann_1",
      universeId: "uni_1",
      title: "Battle of Camlann",
      description: "The final battle of King Arthur.",
      locationId: "loc_camlann",
      participants: [
        { characterId: "char_arthur", role: "PROTAGONIST" },
        { characterId: "char_mordred", role: "ANTAGONIST" },
      ],
      createdBy: "usr_1",
    };

    const result = await handler.execute(command);

    expect(result.eventId).toBe("evt_camlann_1");
    expect(result.title).toBe("Battle of Camlann");
    expect(result.locationId).toBe("loc_camlann");
    expect(result.participants).toHaveLength(2);

    expect(mockEventRepo.save).toHaveBeenCalledTimes(1);
    expect(mockPublisher.publish).toHaveBeenCalledWith(
      "timeline-events",
      expect.objectContaining({
        eventType: "EventCreated",
        eventId: "evt_camlann_1",
      }),
    );
  });

  it("throws DomainValidationError when target universeId does not exist", async () => {
    const command = {
      universeId: "uni_missing",
      title: "Orphan Event",
      description: "Some description",
      createdBy: "usr_1",
    };

    const err = await handler.execute(command).catch((e) => e);
    expect(err).toBeInstanceOf(DomainValidationError);
    expect(err.field).toBe("universeId");
    expect(err.rule).toBe("NOT_FOUND");
    expect(mockEventRepo.save).not.toHaveBeenCalled();
  });

  it("throws DomainValidationError when locationId does not exist", async () => {
    const command = {
      universeId: "uni_1",
      title: "Event at Unknown Location",
      description: "Some description",
      locationId: "loc_missing",
      createdBy: "usr_1",
    };

    const err = await handler.execute(command).catch((e) => e);
    expect(err).toBeInstanceOf(DomainValidationError);
    expect(err.field).toBe("locationId");
    expect(err.rule).toBe("NOT_FOUND");
  });

  it("throws DomainValidationError when location belongs to different universe", async () => {
    const command = {
      universeId: "uni_1",
      title: "Cross-Universe Event",
      description: "Some description",
      locationId: "loc_other_univ",
      createdBy: "usr_1",
    };

    const err = await handler.execute(command).catch((e) => e);
    expect(err).toBeInstanceOf(DomainValidationError);
    expect(err.field).toBe("locationId");
    expect(err.rule).toBe("CROSS_UNIVERSE_PROHIBITED");
  });

  it("throws DomainValidationError when participant character does not exist", async () => {
    const command = {
      universeId: "uni_1",
      title: "Event with Phantom Character",
      description: "Some description",
      participants: [{ characterId: "char_missing" }],
      createdBy: "usr_1",
    };

    const err = await handler.execute(command).catch((e) => e);
    expect(err).toBeInstanceOf(DomainValidationError);
    expect(err.field).toBe("participantCharacterId");
    expect(err.rule).toBe("NOT_FOUND");
  });

  it("throws DomainValidationError when participant character belongs to different universe", async () => {
    const command = {
      universeId: "uni_1",
      title: "Event with Foreign Character",
      description: "Some description",
      participants: [{ characterId: "char_other_univ" }],
      createdBy: "usr_1",
    };

    const err = await handler.execute(command).catch((e) => e);
    expect(err).toBeInstanceOf(DomainValidationError);
    expect(err.field).toBe("participantCharacterId");
    expect(err.rule).toBe("CROSS_UNIVERSE_PROHIBITED");
  });
});
