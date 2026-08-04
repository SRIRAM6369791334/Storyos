import {
  Location,
  LocationName,
  createLocationId,
  createUniverseId,
  createUserId,
} from "@storyos/domain-world-building";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetLocationQueryHandler } from "./get-location.handler.js";

describe("GetLocationQueryHandler", () => {
  let mockLocationRepo: any;
  let handler: GetLocationQueryHandler;

  beforeEach(() => {
    mockLocationRepo = {
      findById: vi.fn(),
      findByUniverseId: vi.fn(),
      findByParentId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    handler = new GetLocationQueryHandler(mockLocationRepo);
  });

  it("returns LocationDTO when location is found", async () => {
    const mockLocation = Location.create({
      locationId: createLocationId("loc_found_1"),
      universeId: createUniverseId("uni_1"),
      name: LocationName.create("Avalon"),
      createdBy: createUserId("usr_1"),
    });

    mockLocationRepo.findById.mockResolvedValue(mockLocation);

    const result = await handler.execute({ locationId: "loc_found_1" });

    expect(result).not.toBeNull();
    expect(result?.locationId).toBe("loc_found_1");
    expect(result?.name).toBe("Avalon");
  });

  it("returns null when location is not found", async () => {
    mockLocationRepo.findById.mockResolvedValue(null);

    const result = await handler.execute({ locationId: "loc_missing" });

    expect(result).toBeNull();
  });
});
