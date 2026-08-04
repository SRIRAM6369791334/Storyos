import { type LocationRepository, createLocationId } from "@storyos/domain-world-building";
import type { LocationDTO } from "../use-cases/create-location.command.js";
import type { ListChildLocationsQuery } from "../use-cases/list-child-locations.query.js";

export class ListChildLocationsQueryHandler {
  private locationRepo: LocationRepository;

  constructor(locationRepo: LocationRepository) {
    this.locationRepo = locationRepo;
  }

  public async execute(query: ListChildLocationsQuery): Promise<LocationDTO[]> {
    const parentId = createLocationId(query.parentId);
    const locations = await this.locationRepo.findByParentId(parentId);

    return locations.map((loc) => ({
      locationId: loc.locationId,
      universeId: loc.universeId,
      parentLocationId: loc.parentLocationId,
      name: loc.name.toString(),
      locationType: loc.locationType,
      canonStatus: loc.canonStatus,
      createdBy: loc.createdBy,
      createdAt: loc.createdAt.toISOString(),
    }));
  }
}
