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

export enum UniverseStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}

export enum MediumType {
  NOVEL = "NOVEL",
  SCREENPLAY = "SCREENPLAY",
  COMIC = "COMIC",
  GAME = "GAME",
  ANIME = "ANIME",
  OTHER = "OTHER",
}

export enum AudienceClassification {
  CHILDREN = "CHILDREN",
  YOUNG_ADULT = "YOUNG_ADULT",
  ADULT = "ADULT",
  ALL_AGES = "ALL_AGES",
}

export enum MaturityRating {
  GENERAL = "GENERAL",
  PARENTAL_GUIDANCE = "PARENTAL_GUIDANCE",
  TEEN = "TEEN",
  MATURE = "MATURE",
  EXPLICIT = "EXPLICIT",
}

export enum GenreClassification {
  FANTASY = "FANTASY",
  SCIENCE_FICTION = "SCIENCE_FICTION",
  DRAMA = "DRAMA",
  ROMANCE = "ROMANCE",
  HORROR = "HORROR",
  MYSTERY = "MYSTERY",
  THRILLER = "THRILLER",
  ADVENTURE = "ADVENTURE",
  HISTORICAL = "HISTORICAL",
  COMEDY = "COMEDY",
  CRIME = "CRIME",
  OTHER = "OTHER",
}

type BrandedId<T extends string> = string & { readonly __brand: T };

export type UniverseId = BrandedId<"UniverseId">;
export type OrganizationId = BrandedId<"OrganizationId">;
export type UserId = BrandedId<"UserId">;

function createId<T extends string>(value: string, brand: T): BrandedId<T> {
  if (value.trim().length === 0) {
    throw new DomainValidationError(brand, "NON_EMPTY", `${brand} must be a non-empty string`);
  }
  return value as BrandedId<T>;
}

export function createUniverseId(value: string): UniverseId {
  return createId(value, "UniverseId");
}

export function createOrganizationId(value: string): OrganizationId {
  return createId(value, "OrganizationId");
}

export function createUserId(value: string): UserId {
  return createId(value, "UserId");
}

export class UniverseTitle {
  public static readonly MAX_LENGTH = 200;

  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static create(value: string): UniverseTitle {
    if (value.trim().length === 0) {
      throw new DomainValidationError("title", "NON_EMPTY", "title must be a non-empty string");
    }
    if (value.length > UniverseTitle.MAX_LENGTH) {
      throw new DomainValidationError(
        "title",
        "MAX_LENGTH",
        `title must not exceed ${UniverseTitle.MAX_LENGTH} characters`,
      );
    }
    if (containsControlCharacters(value)) {
      throw new DomainValidationError(
        "title",
        "PRINTABLE_ONLY",
        "title must contain printable characters only",
      );
    }
    return new UniverseTitle(value);
  }

  public toString(): string {
    return this.value;
  }
}

export class UniverseSynopsis {
  public static readonly MAX_LENGTH = 2000;

  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static create(value: string): UniverseSynopsis {
    if (value.length > UniverseSynopsis.MAX_LENGTH) {
      throw new DomainValidationError(
        "synopsis",
        "MAX_LENGTH",
        `synopsis must not exceed ${UniverseSynopsis.MAX_LENGTH} characters`,
      );
    }
    if (containsControlCharacters(value)) {
      throw new DomainValidationError(
        "synopsis",
        "PRINTABLE_ONLY",
        "synopsis must contain printable characters only",
      );
    }
    return new UniverseSynopsis(value);
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

export interface StoryUniverseCreateProps {
  universeId: UniverseId;
  organizationId: OrganizationId;
  title: UniverseTitle;
  createdBy: UserId;
  status?: UniverseStatus;
  synopsis?: UniverseSynopsis;
  genre?: GenreClassification[];
  primaryMedium?: MediumType;
  targetAudience?: AudienceClassification;
  maturityRating?: MaturityRating;
  linkedUniverseIds?: UniverseId[];
}

export class StoryUniverse {
  public readonly universeId: UniverseId;
  public readonly organizationId: OrganizationId;
  public readonly createdBy: UserId;
  public readonly createdAt: Date;
  private titleValue: UniverseTitle;
  private statusValue: UniverseStatus;
  private synopsisValue: UniverseSynopsis | undefined;
  private genreValue: GenreClassification[];
  private primaryMediumValue: MediumType | undefined;
  private targetAudienceValue: AudienceClassification | undefined;
  private maturityRatingValue: MaturityRating | undefined;
  private linkedUniverseIdsValue: UniverseId[];
  private archivedAtValue: Date | undefined;
  private archivedByValue: UserId | undefined;

  private constructor(props: StoryUniverseCreateProps) {
    this.universeId = props.universeId;
    this.organizationId = props.organizationId;
    this.createdBy = props.createdBy;
    this.createdAt = new Date();
    this.titleValue = props.title;
    this.statusValue = props.status ?? UniverseStatus.DRAFT;
    this.synopsisValue = props.synopsis;
    this.genreValue = props.genre ?? [];
    this.primaryMediumValue = props.primaryMedium;
    this.targetAudienceValue = props.targetAudience;
    this.maturityRatingValue = props.maturityRating;
    this.linkedUniverseIdsValue = props.linkedUniverseIds ?? [];
  }

  public static create(props: StoryUniverseCreateProps): StoryUniverse {
    return new StoryUniverse(props);
  }

  public get title(): UniverseTitle {
    return this.titleValue;
  }

  public get status(): UniverseStatus {
    return this.statusValue;
  }

  public get synopsis(): UniverseSynopsis | undefined {
    return this.synopsisValue;
  }

  public get genre(): GenreClassification[] {
    return [...this.genreValue];
  }

  public get primaryMedium(): MediumType | undefined {
    return this.primaryMediumValue;
  }

  public get targetAudience(): AudienceClassification | undefined {
    return this.targetAudienceValue;
  }

  public get maturityRating(): MaturityRating | undefined {
    return this.maturityRatingValue;
  }

  public get linkedUniverseIds(): UniverseId[] {
    return [...this.linkedUniverseIdsValue];
  }

  public get archivedAt(): Date | undefined {
    return this.archivedAtValue;
  }

  public get archivedBy(): UserId | undefined {
    return this.archivedByValue;
  }

  public rename(newTitle: UniverseTitle): void {
    if (this.statusValue === UniverseStatus.ARCHIVED) {
      throw new DomainValidationError(
        "title",
        "ARCHIVED_IMMUTABLE",
        "title of an ARCHIVED universe cannot be changed",
      );
    }
    this.titleValue = newTitle;
  }

  public activate(): void {
    if (this.statusValue !== UniverseStatus.DRAFT) {
      throw new DomainValidationError(
        "status",
        "INVALID_TRANSITION",
        `transition ${this.statusValue} to ACTIVE is not permitted`,
      );
    }
    this.statusValue = UniverseStatus.ACTIVE;
  }

  public archive(archivedBy: UserId): void {
    if (this.statusValue === UniverseStatus.ARCHIVED) {
      throw new DomainValidationError(
        "status",
        "TERMINAL_STATE",
        "ARCHIVED is a terminal state and cannot be re-entered",
      );
    }
    this.statusValue = UniverseStatus.ARCHIVED;
    this.archivedByValue = archivedBy;
    this.archivedAtValue = new Date();
  }
}

export interface UniverseRepository {
  findById(universeId: UniverseId): Promise<StoryUniverse | null>;
  save(universe: StoryUniverse): Promise<void>;
  delete(universeId: UniverseId): Promise<void>;
}
