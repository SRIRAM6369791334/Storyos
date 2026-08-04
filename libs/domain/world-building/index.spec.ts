import { describe, expect, it } from "vitest";
import {
  CanonStatus,
  DomainValidationError,
  Location,
  LocationName,
  LocationType,
  createLocationId,
  createUniverseId,
  createUserId,
} from "./index.js";

describe("Location Aggregate (World Building Domain)", () => {
  it("creates a valid Location with required props", () => {
    const loc = Location.create({
      locationId: createLocationId("loc_1"),
      universeId: createUniverseId("uni_1"),
      name: LocationName.create("Camelot"),
      createdBy: createUserId("usr_1"),
    });

    expect(loc.locationId).toBe("loc_1");
    expect(loc.universeId).toBe("uni_1");
    expect(loc.name.toString()).toBe("Camelot");
    expect(loc.locationType).toBe(LocationType.OTHER);
    expect(loc.canonStatus).toBe(CanonStatus.DRAFT);
    expect(loc.parentLocationId).toBeUndefined();
  });

  it("supports parentLocationId for hierarchical structures", () => {
    const parentLoc = Location.create({
      locationId: createLocationId("loc_parent"),
      universeId: createUniverseId("uni_1"),
      name: LocationName.create("Logres Region"),
      createdBy: createUserId("usr_1"),
      locationType: LocationType.REGION,
    });

    const childLoc = Location.create({
      locationId: createLocationId("loc_child"),
      universeId: createUniverseId("uni_1"),
      name: LocationName.create("Camelot Castle"),
      createdBy: createUserId("usr_1"),
      parentLocationId: parentLoc.locationId,
      locationType: LocationType.BUILDING,
    });

    expect(childLoc.parentLocationId).toBe("loc_parent");
    expect(childLoc.locationType).toBe(LocationType.BUILDING);
  });

  it("throws DomainValidationError on self-referencing parentLocationId", () => {
    expect(() =>
      Location.create({
        locationId: createLocationId("loc_self"),
        universeId: createUniverseId("uni_1"),
        name: LocationName.create("Loop Location"),
        createdBy: createUserId("usr_1"),
        parentLocationId: createLocationId("loc_self"),
      }),
    ).toThrow(DomainValidationError);
  });

  it("throws DomainValidationError on empty or invalid LocationName", () => {
    expect(() => LocationName.create("")).toThrow(DomainValidationError);
    expect(() => LocationName.create("a".repeat(301))).toThrow(DomainValidationError);
  });
});
