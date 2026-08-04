import {
  Location,
  LocationName,
  createLocationId,
  createUniverseId,
  createUserId,
} from "@storyos/domain-world-building";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListLocationsByUniverseQueryHandler } from "./list-locations-by-universe.handler.js";

describe("ListLocationsByUniverseQueryHandler", () => {
  let mockLocationRepo: any;
  let handler: ListLocationsByUniverseQueryHandler;

  beforeEach(() => {
    mockLocationRepo = {
      findById: vi.fn(),
      findByUniverseId: vi.fn(),
      findByParentId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    handler = new ListLocationsByUniverseQueryHandler(mockLocationRepo);
  });

  it("returns list of LocationDTOs for a given universeId", async () => {
    mockLocationRepo.findByUniverseId.mockResolvedValue([
      Location.create({
        locationId: createLocationId("loc_1"),
        universeId: createUniverseId("uni_1"),
        name: LocationName.create("Camelot"),
        createdBy: createUserId("usr_1"),
      }),
      Location.create({
        locationId: createLocationId("loc_2"),
        universeId: createUniverseId("uni_1"),
        name: LocationName.create("Tintagel"),
        createdBy: createUserId("usr_1"),
      }),
    ]);

    const result = await handler.execute({ universeId: "uni_1" });

    expect(result).toHaveLength(2);
    expect(result[0]?.name).toBe("Camelot");
    expect(result[1]?.name).toBe("Tintagel");
  });
});
