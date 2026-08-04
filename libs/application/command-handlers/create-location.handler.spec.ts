import { DomainValidationError } from "@storyos/domain-world-building";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateLocationCommandHandler } from "./create-location.handler.js";

describe("CreateLocationCommandHandler", () => {
  let mockLocationRepo: any;
  let mockUniverseRepo: any;
  let mockPublisher: any;
  let handler: CreateLocationCommandHandler;

  beforeEach(() => {
    mockLocationRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn().mockResolvedValue(null),
      findByUniverseId: vi.fn().mockResolvedValue([]),
      findByParentId: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    mockUniverseRepo = {
      findById: vi.fn().mockResolvedValue({ universeId: "uni_valid_1" }),
    };

    mockPublisher = {
      publish: vi.fn().mockResolvedValue(undefined),
    };

    handler = new CreateLocationCommandHandler(mockLocationRepo, mockUniverseRepo, mockPublisher);
  });

  it("creates and saves a Location when Universe exists", async () => {
    const command = {
      locationId: "loc_test_1",
      universeId: "uni_valid_1",
      name: "Camelot Castle",
      locationType: "BUILDING",
      createdBy: "usr_test_1",
    };

    const result = await handler.execute(command);

    expect(result.locationId).toBe("loc_test_1");
    expect(result.universeId).toBe("uni_valid_1");
    expect(result.name).toBe("Camelot Castle");
    expect(result.locationType).toBe("BUILDING");

    expect(mockUniverseRepo.findById).toHaveBeenCalledWith("uni_valid_1");
    expect(mockLocationRepo.save).toHaveBeenCalledTimes(1);
    expect(mockPublisher.publish).toHaveBeenCalledWith(
      "location-events",
      expect.objectContaining({
        eventType: "LocationCreated",
        locationId: "loc_test_1",
        name: "Camelot Castle",
      }),
    );
  });

  it("throws DomainValidationError when universeId does not exist", async () => {
    mockUniverseRepo.findById.mockResolvedValue(null);

    const command = {
      locationId: "loc_test_1",
      universeId: "uni_nonexistent",
      name: "Camelot Castle",
      createdBy: "usr_test_1",
    };

    await expect(handler.execute(command)).rejects.toThrow(DomainValidationError);
    expect(mockLocationRepo.save).not.toHaveBeenCalled();
  });

  it("throws DomainValidationError when parentLocationId does not exist", async () => {
    mockLocationRepo.findById.mockResolvedValue(null);

    const command = {
      locationId: "loc_child",
      universeId: "uni_valid_1",
      parentLocationId: "loc_parent_missing",
      name: "Great Hall",
      createdBy: "usr_test_1",
    };

    await expect(handler.execute(command)).rejects.toThrow(DomainValidationError);
    expect(mockLocationRepo.save).not.toHaveBeenCalled();
  });

  it("throws DomainValidationError when parentLocationId belongs to a different universe", async () => {
    mockLocationRepo.findById.mockResolvedValue({
      locationId: "loc_parent_other",
      universeId: "uni_other_2",
    });

    const command = {
      locationId: "loc_child",
      universeId: "uni_valid_1",
      parentLocationId: "loc_parent_other",
      name: "Great Hall",
      createdBy: "usr_test_1",
    };

    await expect(handler.execute(command)).rejects.toThrow(DomainValidationError);
    expect(mockLocationRepo.save).not.toHaveBeenCalled();
  });
});
