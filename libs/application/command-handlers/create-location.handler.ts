import type { IEventPublisher, UniverseRepository } from "@storyos/domain-universe";
import {
  DomainValidationError,
  Location,
  type LocationCreatedEvent,
  LocationName,
  type LocationRepository,
  type LocationType,
  createLocationId,
  createUniverseId,
  createUserId,
} from "@storyos/domain-world-building";
import type { CreateLocationCommand, LocationDTO } from "../use-cases/create-location.command.js";

export class CreateLocationCommandHandler {
  private locationRepo: LocationRepository;
  private universeRepo: UniverseRepository;
  private eventPublisher?: IEventPublisher;

  constructor(
    locationRepo: LocationRepository,
    universeRepo: UniverseRepository,
    eventPublisher?: IEventPublisher,
  ) {
    this.locationRepo = locationRepo;
    this.universeRepo = universeRepo;
    this.eventPublisher = eventPublisher;
  }

  public async execute(command: CreateLocationCommand): Promise<LocationDTO> {
    const universeId = createUniverseId(command.universeId);

    // 1. Validate parent Universe existence
    const universeExists = await this.universeRepo.findById(universeId as any);
    if (!universeExists) {
      throw new DomainValidationError(
        "universeId",
        "NOT_FOUND",
        `Universe with ID '${command.universeId}' does not exist`,
      );
    }

    // 2. Validate parentLocationId if provided
    let parentLocationId: ReturnType<typeof createLocationId> | undefined = undefined;
    if (command.parentLocationId && command.parentLocationId.trim().length > 0) {
      parentLocationId = createLocationId(command.parentLocationId);
      const parentLocation = await this.locationRepo.findById(parentLocationId);

      if (!parentLocation) {
        throw new DomainValidationError(
          "parentLocationId",
          "NOT_FOUND",
          `Parent location with ID '${command.parentLocationId}' does not exist`,
        );
      }

      if (parentLocation.universeId !== command.universeId) {
        throw new DomainValidationError(
          "parentLocationId",
          "CROSS_UNIVERSE_PROHIBITED",
          `Parent location '${command.parentLocationId}' belongs to a different universe`,
        );
      }
    }

    const locIdStr =
      command.locationId && command.locationId.trim().length > 0
        ? command.locationId
        : `loc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const locationId = createLocationId(locIdStr);
    const name = LocationName.create(command.name);
    const createdBy = createUserId(command.createdBy);

    let locationType: LocationType | undefined = undefined;
    if (command.locationType && command.locationType.trim().length > 0) {
      locationType = command.locationType as LocationType;
    }

    const location = Location.create({
      locationId,
      universeId,
      parentLocationId,
      name,
      locationType,
      createdBy,
    });

    await this.locationRepo.save(location);

    if (this.eventPublisher) {
      const event: LocationCreatedEvent = {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        eventType: "LocationCreated",
        locationId: location.locationId,
        universeId: location.universeId,
        parentLocationId: location.parentLocationId,
        name: location.name.toString(),
        locationType: location.locationType,
        canonStatus: location.canonStatus,
        createdBy: location.createdBy,
        createdAt: location.createdAt.toISOString(),
      };
      await this.eventPublisher.publish(
        "location-events",
        event as unknown as Record<string, unknown>,
      );
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
