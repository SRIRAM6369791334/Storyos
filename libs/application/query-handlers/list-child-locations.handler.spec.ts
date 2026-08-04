import {
  Location,
  LocationName,
  createLocationId,
  createUniverseId,
  createUserId,
} from "@storyos/domain-world-building";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListChildLocationsQueryHandler } from "./list-child-locations.handler.js";

describe("ListChildLocationsQueryHandler", () => {
  let mockLocationRepo: any;
  let handler: ListChildLocationsQueryHandler;

  beforeEach(() => {
    mockLocationRepo = {
      findById: vi.fn(),
      findByUniverseId: vi.fn(),
      findByParentId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    handler = new ListChildLocationsQueryHandler(mockLocationRepo);
  });

  it("returns list of child LocationDTOs for a given parentId", async () => {
    mockLocationRepo.findByParentId.mockResolvedValue([
      Location.create({
        locationId: createLocationId("loc_child_1"),
        universeId: createUniverseId("uni_1"),
        parentLocationId: createLocationId("loc_parent_1"),
        name: LocationName.create("Great Hall"),
        createdBy: createUserId("usr_1"),
      }),
      Location.create({
        locationId: createLocationId("loc_child_2"),
        universeId: createUniverseId("uni_1"),
        parentLocationId: createLocationId("loc_parent_1"),
        name: LocationName.create("Armory"),
        createdBy: createUserId("usr_1"),
      }),
    ]);

    const result = await handler.execute({ parentId: "loc_parent_1" });

    expect(result).toHaveLength(2);
    expect(result[0]?.name).toBe("Great Hall");
    expect(result[0]?.parentLocationId).toBe("loc_parent_1");
    expect(result[1]?.name).toBe("Armory");

    expect(mockLocationRepo.findByParentId).toHaveBeenCalledWith("loc_parent_1");
  });
});
