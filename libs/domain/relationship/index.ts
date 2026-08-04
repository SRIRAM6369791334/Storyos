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

export enum RelationshipType {
  ALLY = "ALLY",
  ENEMY = "ENEMY",
  RIVAL = "RIVAL",
  FRIEND = "FRIEND",
  ACQUAINTANCE = "ACQUAINTANCE",
  STRANGER = "STRANGER",
  MENTOR = "MENTOR",
  STUDENT_OF = "STUDENT_OF",
  FATHER_OF = "FATHER_OF",
  MOTHER_OF = "MOTHER_OF",
  CHILD_OF = "CHILD_OF",
  SIBLING_OF = "SIBLING_OF",
  SPOUSE_OF = "SPOUSE_OF",
  ROMANTIC_PARTNER = "ROMANTIC_PARTNER",
  EMPLOYER_OF = "EMPLOYER_OF",
  EMPLOYED_BY = "EMPLOYED_BY",
  COMMANDS = "COMMANDS",
  COMMANDED_BY = "COMMANDED_BY",
  TRUSTS = "TRUSTS",
  DISTRUSTS = "DISTRUSTS",
  FEARS = "FEARS",
  RESPECTS = "RESPECTS",
  DESPISES = "DESPISES",
  PROTECTS = "PROTECTS",
  BETRAYED = "BETRAYED",
  KILLED = "KILLED",
  CREATED = "CREATED",
  GUARDIAN_OF = "GUARDIAN_OF",
  SWORN_TO = "SWORN_TO",
}

export enum RelationshipStatus {
  ACTIVE = "ACTIVE",
  BROKEN = "BROKEN",
  SECRET = "SECRET",
  ONE_SIDED = "ONE_SIDED",
  DECEASED = "DECEASED",
}

export enum CanonStatus {
  DRAFT = "DRAFT",
  PENDING = "PENDING",
  CANON = "CANON",
  NON_CANON = "NON_CANON",
}

export enum RelationshipDirection {
  DIRECTED = "DIRECTED",
  MUTUAL = "MUTUAL",
}

type BrandedId<T extends string> = string & { readonly __brand: T };

export type RelationshipId = BrandedId<"RelationshipId">;
export type CharacterId = BrandedId<"CharacterId">;
export type UniverseId = BrandedId<"UniverseId">;
export type UserId = BrandedId<"UserId">;

function createId<T extends string>(value: string, brand: T): BrandedId<T> {
  if (value.trim().length === 0) {
    throw new DomainValidationError(brand, "NON_EMPTY", `${brand} must be a non-empty string`);
  }
  return value as BrandedId<T>;
}

export function createRelationshipId(value: string): RelationshipId {
  return createId(value, "RelationshipId");
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

export interface RelationshipCreateProps {
  relationshipId: RelationshipId;
  universeId: UniverseId;
  sourceCharacterId: CharacterId;
  targetCharacterId: CharacterId;
  relationshipType: RelationshipType;
  createdBy: UserId;
  direction?: RelationshipDirection;
  status?: RelationshipStatus;
  canonStatus?: CanonStatus;
}

export class Relationship {
  public readonly relationshipId: RelationshipId;
  public readonly universeId: UniverseId;
  public readonly sourceCharacterId: CharacterId;
  public readonly targetCharacterId: CharacterId;
  public readonly relationshipType: RelationshipType;
  public readonly createdBy: UserId;
  public readonly createdAt: Date;
  private directionValue: RelationshipDirection;
  private statusValue: RelationshipStatus;
  private canonStatusValue: CanonStatus;

  private constructor(props: RelationshipCreateProps) {
    if (props.sourceCharacterId === props.targetCharacterId) {
      throw new DomainValidationError(
        "targetCharacterId",
        "SELF_REFERENCE_PROHIBITED",
        "A character cannot have a relationship with themselves",
      );
    }

    this.relationshipId = props.relationshipId;
    this.universeId = props.universeId;
    this.sourceCharacterId = props.sourceCharacterId;
    this.targetCharacterId = props.targetCharacterId;
    this.relationshipType = props.relationshipType;
    this.createdBy = props.createdBy;
    this.createdAt = new Date();
    this.directionValue = props.direction ?? RelationshipDirection.DIRECTED;
    this.statusValue = props.status ?? RelationshipStatus.ACTIVE;
    this.canonStatusValue = props.canonStatus ?? CanonStatus.DRAFT;
  }

  public static create(props: RelationshipCreateProps): Relationship {
    return new Relationship(props);
  }

  public get direction(): RelationshipDirection {
    return this.directionValue;
  }

  public get status(): RelationshipStatus {
    return this.statusValue;
  }

  public get canonStatus(): CanonStatus {
    return this.canonStatusValue;
  }
}

export interface RelationshipRepository {
  findById(relationshipId: RelationshipId): Promise<Relationship | null>;
  findByCharacterId(characterId: CharacterId): Promise<Relationship[]>;
  save(relationship: Relationship): Promise<void>;
  delete(relationshipId: RelationshipId): Promise<void>;
}

export type IRelationshipRepository = RelationshipRepository;

export interface RelationshipCreatedEvent {
  eventId: string;
  eventType: "RelationshipCreated";
  relationshipId: string;
  universeId: string;
  sourceCharacterId: string;
  targetCharacterId: string;
  relationshipType: string;
  direction: string;
  status: string;
  canonStatus: string;
  createdBy: string;
  createdAt: string;
}
