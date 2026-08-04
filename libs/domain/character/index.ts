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

export enum CharacterStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  PENDING_CANON_REVIEW = "PENDING_CANON_REVIEW",
  CANON = "CANON",
  ARCHIVED = "ARCHIVED",
}

export enum CanonStatus {
  DRAFT = "DRAFT",
  PENDING = "PENDING",
  CANON = "CANON",
  NON_CANON = "NON_CANON",
  SPECULATIVE = "SPECULATIVE",
}

type BrandedId<T extends string> = string & { readonly __brand: T };

export type CharacterId = BrandedId<"CharacterId">;
export type UniverseId = BrandedId<"UniverseId">;
export type UserId = BrandedId<"UserId">;

function createId<T extends string>(value: string, brand: T): BrandedId<T> {
  if (value.trim().length === 0) {
    throw new DomainValidationError(brand, "NON_EMPTY", `${brand} must be a non-empty string`);
  }
  return value as BrandedId<T>;
}

export function createCharacterId(value: string): CharacterId {
  return createId(value, "CharacterId");
}

export function createUniverseId(value: string): UniverseId {
  return createId(value, "UniverseId");
}

export function createUserId(value: string): UserId {
  return createId(value, "UserId");
}

export class CharacterName {
  public static readonly MAX_LENGTH = 300;

  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static create(value: string): CharacterName {
    if (value.trim().length === 0) {
      throw new DomainValidationError(
        "primaryName",
        "NON_EMPTY",
        "primaryName must be a non-empty string",
      );
    }
    if (value.length > CharacterName.MAX_LENGTH) {
      throw new DomainValidationError(
        "primaryName",
        "MAX_LENGTH",
        `primaryName must not exceed ${CharacterName.MAX_LENGTH} characters`,
      );
    }
    if (containsControlCharacters(value)) {
      throw new DomainValidationError(
        "primaryName",
        "PRINTABLE_ONLY",
        "primaryName must contain printable characters only",
      );
    }
    return new CharacterName(value);
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

export interface CharacterCreateProps {
  characterId: CharacterId;
  universeId: UniverseId;
  primaryName: CharacterName;
  createdBy: UserId;
  status?: CharacterStatus;
  canonStatus?: CanonStatus;
}

export class Character {
  public readonly characterId: CharacterId;
  public readonly universeId: UniverseId;
  public readonly createdBy: UserId;
  public readonly createdAt: Date;
  private primaryNameValue: CharacterName;
  private statusValue: CharacterStatus;
  private canonStatusValue: CanonStatus;

  private constructor(props: CharacterCreateProps) {
    this.characterId = props.characterId;
    this.universeId = props.universeId;
    this.createdBy = props.createdBy;
    this.createdAt = new Date();
    this.primaryNameValue = props.primaryName;
    this.statusValue = props.status ?? CharacterStatus.DRAFT;
    this.canonStatusValue = props.canonStatus ?? CanonStatus.DRAFT;
  }

  public static create(props: CharacterCreateProps): Character {
    return new Character(props);
  }

  public get primaryName(): CharacterName {
    return this.primaryNameValue;
  }

  public get status(): CharacterStatus {
    return this.statusValue;
  }

  public get canonStatus(): CanonStatus {
    return this.canonStatusValue;
  }

  public rename(newName: CharacterName): void {
    if (this.canonStatusValue === CanonStatus.CANON) {
      throw new DomainValidationError(
        "primaryName",
        "CANON_IMMUTABLE",
        "primaryName of a CANON character cannot be changed without a Canon Change Request",
      );
    }
    if (this.statusValue === CharacterStatus.ARCHIVED) {
      throw new DomainValidationError(
        "primaryName",
        "ARCHIVED_IMMUTABLE",
        "primaryName of an ARCHIVED character cannot be changed",
      );
    }
    this.primaryNameValue = newName;
  }

  public archive(): void {
    if (this.statusValue === CharacterStatus.ARCHIVED) {
      throw new DomainValidationError(
        "status",
        "TERMINAL_STATE",
        "ARCHIVED is a terminal state and cannot be re-entered",
      );
    }
    this.statusValue = CharacterStatus.ARCHIVED;
  }
}

export interface CharacterRepository {
  findById(characterId: CharacterId): Promise<Character | null>;
  findByUniverseId(universeId: UniverseId): Promise<Character[]>;
  save(character: Character): Promise<void>;
  delete(characterId: CharacterId): Promise<void>;
}

export type ICharacterRepository = CharacterRepository;

export interface CharacterCreatedEvent {
  eventId: string;
  eventType: "CharacterCreated";
  characterId: string;
  universeId: string;
  primaryName: string;
  createdBy: string;
  createdAt: string;
}
