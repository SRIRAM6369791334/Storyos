import { type LocationRepository, createLocationId } from "@storyos/domain-world-building";
import type { LocationDTO } from "../use-cases/create-location.command.js";
import type { GetLocationQuery } from "../use-cases/get-location.query.js";

export class GetLocationQueryHandler {
  private locationRepo: LocationRepository;

  constructor(locationRepo: LocationRepository) {
    this.locationRepo = locationRepo;
  }

  public async execute(query: GetLocationQuery): Promise<LocationDTO | null> {
    const locationId = createLocationId(query.locationId);
    const location = await this.locationRepo.findById(locationId);

    if (!location) {
      return null;
    }

    return {
      locationId: location.locationId,
      universeId: location.universeId,
      parentLocationId: location.parentLocationId,
      name: location.name.toString(),
      locationType: location.locationType,
      canonStatus: location.canonStatus,
      createdBy: location.createdBy,
      createdAt: location.createdAt.toISOString(),
    };
  }
}
