export class DomainValidationError extends Error {
  public readonly field: string;
  public readonly rule: string;

  constructor(field: string, rule: string, message: string) {
    super(message);
    this.name = "DomainValidationError";
    this.field = field;
    this.rule = rule;
  }
}

export enum LocationType {
  CONTINENT = "CONTINENT",
  REGION = "REGION",
  NATION = "NATION",
  CITY = "CITY",
  DISTRICT = "DISTRICT",
  BUILDING = "BUILDING",
  ROOM = "ROOM",
  NATURAL = "NATURAL",
  COSMOLOGICAL = "COSMOLOGICAL",
  OTHER = "OTHER",
}

export enum CanonStatus {
  DRAFT = "DRAFT",
  PENDING = "PENDING",
  CANON = "CANON",
  NON_CANON = "NON_CANON",
}

type BrandedId<T extends string> = string & { readonly __brand: T };

export type LocationId = BrandedId<"LocationId">;
export type UniverseId = BrandedId<"UniverseId">;
export type UserId = BrandedId<"UserId">;

function createId<T extends string>(value: string, brand: T): BrandedId<T> {
  if (value.trim().length === 0) {
    throw new DomainValidationError(brand, "NON_EMPTY", `${brand} must be a non-empty string`);
  }
  return value as BrandedId<T>;
}

export function createLocationId(value: string): LocationId {
  return createId(value, "LocationId");
}

export function createUniverseId(value: string): UniverseId {
  return createId(value, "UniverseId");
}

export function createUserId(value: string): UserId {
  return createId(value, "UserId");
}

export class LocationName {
  public static readonly MAX_LENGTH = 300;

  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static create(value: string): LocationName {
    if (value.trim().length === 0) {
      throw new DomainValidationError("name", "NON_EMPTY", "name must be a non-empty string");
    }
    if (value.length > LocationName.MAX_LENGTH) {
      throw new DomainValidationError(
        "name",
        "MAX_LENGTH",
        `name must not exceed ${LocationName.MAX_LENGTH} characters`,
      );
    }
    if (containsControlCharacters(value)) {
      throw new DomainValidationError(
        "name",
        "PRINTABLE_ONLY",
        "name must contain printable characters only",
      );
    }
    return new LocationName(value);
  }

  public toString(): string {
    return this.value;
  }
}

function containsControlCharacters(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code < 0x20 || code === 0x7f) {
      return true;
    }
  }
  return false;
}

export interface LocationCreateProps {
  locationId: LocationId;
  universeId: UniverseId;
  name: LocationName;
  createdBy: UserId;
  parentLocationId?: LocationId;
  locationType?: LocationType;
  canonStatus?: CanonStatus;
}

export class Location {
  public readonly locationId: LocationId;
  public readonly universeId: UniverseId;
  public readonly createdBy: UserId;
  public readonly createdAt: Date;
  private nameValue: LocationName;
  private parentLocationIdValue: LocationId | undefined;
  private locationTypeValue: LocationType;
  private canonStatusValue: CanonStatus;

  private constructor(props: LocationCreateProps) {
    this.locationId = props.locationId;
    this.universeId = props.universeId;
    this.createdBy = props.createdBy;
    this.createdAt = new Date();
    this.nameValue = props.name;
    this.parentLocationIdValue = props.parentLocationId;
    this.locationTypeValue = props.locationType ?? LocationType.OTHER;
    this.canonStatusValue = props.canonStatus ?? CanonStatus.DRAFT;

    if (props.parentLocationId && props.parentLocationId === props.locationId) {
      throw new DomainValidationError(
        "parentLocationId",
        "SELF_REFERENCE_PROHIBITED",
        "A location cannot be its own parent",
      );
    }
  }

  public static create(props: LocationCreateProps): Location {
    return new Location(props);
  }

  public get name(): LocationName {
    return this.nameValue;
  }

  public get parentLocationId(): LocationId | undefined {
    return this.parentLocationIdValue;
  }

  public get locationType(): LocationType {
    return this.locationTypeValue;
  }

  public get canonStatus(): CanonStatus {
    return this.canonStatusValue;
  }

  public rename(newName: LocationName): void {
    this.nameValue = newName;
  }

  public setParent(newParentId?: LocationId): void {
    if (newParentId && newParentId === this.locationId) {
      throw new DomainValidationError(
        "parentLocationId",
        "SELF_REFERENCE_PROHIBITED",
        "A location cannot be its own parent",
      );
    }
    this.parentLocationIdValue = newParentId;
  }
}

export interface LocationRepository {
  findById(locationId: LocationId): Promise<Location | null>;
  findByUniverseId(universeId: UniverseId): Promise<Location[]>;
  findByParentId(parentId: LocationId): Promise<Location[]>;
  save(location: Location): Promise<void>;
  delete(locationId: LocationId): Promise<void>;
}

export type ILocationRepository = LocationRepository;

export interface LocationCreatedEvent {
  eventId: string;
  eventType: "LocationCreated";
  locationId: string;
  universeId: string;
  parentLocationId?: string;
  name: string;
  locationType: string;
  canonStatus: string;
  createdBy: string;
  createdAt: string;
}
