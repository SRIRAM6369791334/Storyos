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

export enum EventStatus {
  CANON = "CANON",
  RUMORED = "RUMORED",
  DISPUTED = "DISPUTED",
  ERASED = "ERASED",
}

type BrandedId<T extends string> = string & { readonly __brand: T };

export type EventId = BrandedId<"EventId">;
export type UniverseId = BrandedId<"UniverseId">;
export type CharacterId = BrandedId<"CharacterId">;
export type LocationId = BrandedId<"LocationId">;
export type UserId = BrandedId<"UserId">;

function createId<T extends string>(value: string, brand: T): BrandedId<T> {
  if (value.trim().length === 0) {
    throw new DomainValidationError(brand, "NON_EMPTY", `${brand} must be a non-empty string`);
  }
  return value as BrandedId<T>;
}

export function createEventId(value: string): EventId {
  return createId(value, "EventId");
}

export function createUniverseId(value: string): UniverseId {
  return createId(value, "UniverseId");
}

export function createCharacterId(value: string): CharacterId {
  return createId(value, "CharacterId");
}

export function createLocationId(value: string): LocationId {
  return createId(value, "LocationId");
}

export function createUserId(value: string): UserId {
  return createId(value, "UserId");
}

export interface EventParticipant {
  characterId: CharacterId;
  role?: string;
}

export interface EventCreateProps {
  eventId: EventId;
  universeId: UniverseId;
  title: string;
  description: string;
  locationId?: LocationId;
  status?: EventStatus;
  participants?: EventParticipant[];
  createdBy: UserId;
}

export class Event {
  public readonly eventId: EventId;
  public readonly universeId: UniverseId;
  public readonly title: string;
  public readonly description: string;
  public readonly locationId?: LocationId;
  public readonly status: EventStatus;
  public readonly createdBy: UserId;
  public readonly createdAt: Date;
  private participantList: EventParticipant[];

  private constructor(props: EventCreateProps) {
    if (props.title.trim().length === 0) {
      throw new DomainValidationError(
        "title",
        "NON_EMPTY",
        "Event title must be a non-empty string",
      );
    }
    if (props.description.trim().length === 0) {
      throw new DomainValidationError(
        "description",
        "NON_EMPTY",
        "Event description must be a non-empty string",
      );
    }

    this.eventId = props.eventId;
    this.universeId = props.universeId;
    this.title = props.title.trim();
    this.description = props.description.trim();
    this.locationId = props.locationId;
    this.status = props.status ?? EventStatus.CANON;
    this.createdBy = props.createdBy;
    this.createdAt = new Date();
    this.participantList = props.participants ? [...props.participants] : [];
  }

  public static create(props: EventCreateProps): Event {
    return new Event(props);
  }

  public get participants(): ReadonlyArray<EventParticipant> {
    return this.participantList;
  }
}

export interface EventRepository {
  findById(eventId: EventId): Promise<Event | null>;
  findByUniverseId(universeId: UniverseId): Promise<Event[]>;
  findByCharacterId(characterId: CharacterId): Promise<Event[]>;
  save(event: Event): Promise<void>;
  delete(eventId: EventId): Promise<void>;
}

export type IEventRepository = EventRepository;

export interface EventCreatedEvent {
  eventId: string;
  eventType: "EventCreated";
  universeId: string;
  title: string;
  description: string;
  locationId?: string;
  status: string;
  participants: Array<{ characterId: string; role?: string }>;
  createdBy: string;
  createdAt: string;
}
