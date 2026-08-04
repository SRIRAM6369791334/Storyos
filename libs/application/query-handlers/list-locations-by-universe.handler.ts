import { type LocationRepository, createUniverseId } from "@storyos/domain-world-building";
import type { LocationDTO } from "../use-cases/create-location.command.js";
import type { ListLocationsByUniverseQuery } from "../use-cases/list-locations-by-universe.query.js";

export class ListLocationsByUniverseQueryHandler {
  private locationRepo: LocationRepository;

  constructor(locationRepo: LocationRepository) {
    this.locationRepo = locationRepo;
  }

  public async execute(query: ListLocationsByUniverseQuery): Promise<LocationDTO[]> {
    const universeId = createUniverseId(query.universeId);
    const locations = await this.locationRepo.findByUniverseId(universeId);

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
