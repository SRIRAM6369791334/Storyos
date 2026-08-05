// ─────────────────────────────────────────────────────────────────────────────
// libs/domain/narrative/index.ts
// Narrative Domain — Content Hierarchy Sub-Domain (Sprint 7)
// Scope: Work, Chapter, Scene aggregates + value objects + repo interfaces + events
// Hexagonal rule: NO imports from other @storyos/domain-* packages.
//                 Cross-domain references use opaque branded ID types only.
// ─────────────────────────────────────────────────────────────────────────────

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

// ── Enums ──────────────────────────────────────────────────────────────────

/** Content Status Sub-Domain (§2.7) — workflow stage of a narrative unit */
export enum DraftStatus {
  DRAFT = "DRAFT",
  IN_REVIEW = "IN_REVIEW",
  CANON = "CANON",
  ARCHIVED = "ARCHIVED",
}

/** Classification of the narrative product */
export enum WorkType {
  NOVEL = "NOVEL",
  SCREENPLAY = "SCREENPLAY",
  COMIC = "COMIC",
  GAME = "GAME",
  ANTHOLOGY = "ANTHOLOGY",
  OTHER = "OTHER",
}

/** Truth confirmation status — separate from DraftStatus (matches Character/Location pattern) */
export enum CanonStatus {
  DRAFT = "DRAFT",
  PENDING = "PENDING",
  CANON = "CANON",
  NON_CANON = "NON_CANON",
}

// ── Branded ID Types ────────────────────────────────────────────────────────
// Rule ID-005: each entity type has its own typed identifier.
// Cross-domain IDs (CharacterId, LocationId) are opaque strings; no domain
// objects from other packages are imported here.

type BrandedId<T extends string> = string & { readonly __brand: T };

export type WorkId = BrandedId<"WorkId">;
export type ChapterId = BrandedId<"ChapterId">;
export type SceneId = BrandedId<"SceneId">;
export type UniverseId = BrandedId<"UniverseId">;
export type UserId = BrandedId<"UserId">;
/** Cross-domain reference: character participant IDs stored as opaque strings */
export type CharacterId = BrandedId<"CharacterId">;
/** Cross-domain reference: location setting ID stored as opaque string */
export type LocationId = BrandedId<"LocationId">;

function createId<T extends string>(value: string, brand: T): BrandedId<T> {
  if (value.trim().length === 0) {
    throw new DomainValidationError(brand, "NON_EMPTY", `${brand} must be a non-empty string`);
  }
  return value as BrandedId<T>;
}

export function createWorkId(value: string): WorkId {
  return createId(value, "WorkId");
}
export function createChapterId(value: string): ChapterId {
  return createId(value, "ChapterId");
}
export function createSceneId(value: string): SceneId {
  return createId(value, "SceneId");
}
export function createUniverseId(value: string): UniverseId {
  return createId(value, "UniverseId");
}
export function createUserId(value: string): UserId {
  return createId(value, "UserId");
}
export function createCharacterId(value: string): CharacterId {
  return createId(value, "CharacterId");
}
export function createLocationId(value: string): LocationId {
  return createId(value, "LocationId");
}

// ── Value Objects ───────────────────────────────────────────────────────────
// Rule VO-001 through VO-005: immutable, no identity, self-validating.

function containsControlCharacters(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

function validateTitle(field: string, value: string, maxLength: number): string {
  if (value.trim().length === 0) {
    throw new DomainValidationError(field, "NON_EMPTY", `${field} must be a non-empty string`);
  }
  if (value.length > maxLength) {
    throw new DomainValidationError(
      field,
      "MAX_LENGTH",
      `${field} must not exceed ${maxLength} characters`,
    );
  }
  if (containsControlCharacters(value)) {
    throw new DomainValidationError(
      field,
      "PRINTABLE_ONLY",
      `${field} must contain printable characters only`,
    );
  }
  return value;
}

export class WorkTitle {
  public static readonly MAX_LENGTH = 400;
  private readonly value: string;
  private constructor(value: string) {
    this.value = value;
  }
  public static create(value: string): WorkTitle {
    return new WorkTitle(validateTitle("title", value, WorkTitle.MAX_LENGTH));
  }
  public toString(): string {
    return this.value;
  }
}

export class ChapterTitle {
  public static readonly MAX_LENGTH = 400;
  private readonly value: string;
  private constructor(value: string) {
    this.value = value;
  }
  public static create(value: string): ChapterTitle {
    return new ChapterTitle(validateTitle("title", value, ChapterTitle.MAX_LENGTH));
  }
  public toString(): string {
    return this.value;
  }
}

export class SceneTitle {
  public static readonly MAX_LENGTH = 400;
  private readonly value: string;
  private constructor(value: string) {
    this.value = value;
  }
  public static create(value: string): SceneTitle {
    return new SceneTitle(validateTitle("title", value, SceneTitle.MAX_LENGTH));
  }
  public toString(): string {
    return this.value;
  }
}

// ── Work Aggregate Root ─────────────────────────────────────────────────────
// A complete narrative product (novel, screenplay, game, comic volume).
// Depends on Story Universe (universeId FK); Part of Narrative Domain.

export interface WorkCreateProps {
  workId: WorkId;
  universeId: UniverseId;
  title: WorkTitle;
  createdBy: UserId;
  workType?: WorkType;
  draftStatus?: DraftStatus;
  canonStatus?: CanonStatus;
  createdAt?: Date;
}

export class Work {
  public readonly workId: WorkId;
  public readonly universeId: UniverseId;
  public readonly createdBy: UserId;
  public readonly createdAt: Date;
  private titleValue: WorkTitle;
  private workTypeValue: WorkType;
  private draftStatusValue: DraftStatus;
  private canonStatusValue: CanonStatus;

  private constructor(props: WorkCreateProps) {
    this.workId = props.workId;
    this.universeId = props.universeId;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt ?? new Date();
    this.titleValue = props.title;
    this.workTypeValue = props.workType ?? WorkType.OTHER;
    this.draftStatusValue = props.draftStatus ?? DraftStatus.DRAFT;
    this.canonStatusValue = props.canonStatus ?? CanonStatus.DRAFT;
  }

  public static create(props: WorkCreateProps): Work {
    return new Work(props);
  }

  public get title(): WorkTitle {
    return this.titleValue;
  }
  public get workType(): WorkType {
    return this.workTypeValue;
  }
  public get draftStatus(): DraftStatus {
    return this.draftStatusValue;
  }
  public get canonStatus(): CanonStatus {
    return this.canonStatusValue;
  }
}

// ── Chapter Aggregate Root ──────────────────────────────────────────────────
// A named section of a Work. Required FK: workId.
// Volume is a deferred level between Work and Chapter (not implemented this sprint).

export interface ChapterCreateProps {
  chapterId: ChapterId;
  workId: WorkId;
  title: ChapterTitle;
  createdBy: UserId;
  sequenceNumber?: number;
  draftStatus?: DraftStatus;
  createdAt?: Date;
}

export class Chapter {
  public readonly chapterId: ChapterId;
  public readonly workId: WorkId;
  public readonly createdBy: UserId;
  public readonly createdAt: Date;
  private titleValue: ChapterTitle;
  private sequenceNumberValue: number;
  private draftStatusValue: DraftStatus;

  private constructor(props: ChapterCreateProps) {
    this.chapterId = props.chapterId;
    this.workId = props.workId;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt ?? new Date();
    this.titleValue = props.title;
    this.sequenceNumberValue = props.sequenceNumber ?? 1;
    this.draftStatusValue = props.draftStatus ?? DraftStatus.DRAFT;
  }

  public static create(props: ChapterCreateProps): Chapter {
    return new Chapter(props);
  }

  public get title(): ChapterTitle {
    return this.titleValue;
  }
  public get sequenceNumber(): number {
    return this.sequenceNumberValue;
  }
  public get draftStatus(): DraftStatus {
    return this.draftStatusValue;
  }
}

// ── Scene Aggregate Root ────────────────────────────────────────────────────
// The atomic unit of narrative — a single continuous action in one time and place.
// Required FK: chapterId.
// Optional cross-domain references (opaque ID only — no domain object imports):
//   characterIds[] — participant characters (many-to-many via scene_participants table)
//   locationId     — scene setting (optional many-to-one to Location aggregate)

export interface SceneCreateProps {
  sceneId: SceneId;
  chapterId: ChapterId;
  title: SceneTitle;
  createdBy: UserId;
  sequenceNumber?: number;
  draftStatus?: DraftStatus;
  characterIds?: CharacterId[];
  locationId?: LocationId;
  createdAt?: Date;
}

export class Scene {
  public readonly sceneId: SceneId;
  public readonly chapterId: ChapterId;
  public readonly createdBy: UserId;
  public readonly createdAt: Date;
  private titleValue: SceneTitle;
  private sequenceNumberValue: number;
  private draftStatusValue: DraftStatus;
  private characterIdsValue: CharacterId[];
  private locationIdValue: LocationId | undefined;

  private constructor(props: SceneCreateProps) {
    this.sceneId = props.sceneId;
    this.chapterId = props.chapterId;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt ?? new Date();
    this.titleValue = props.title;
    this.sequenceNumberValue = props.sequenceNumber ?? 1;
    this.draftStatusValue = props.draftStatus ?? DraftStatus.DRAFT;
    this.characterIdsValue = props.characterIds ?? [];
    this.locationIdValue = props.locationId;
  }

  public static create(props: SceneCreateProps): Scene {
    return new Scene(props);
  }

  public get title(): SceneTitle {
    return this.titleValue;
  }
  public get sequenceNumber(): number {
    return this.sequenceNumberValue;
  }
  public get draftStatus(): DraftStatus {
    return this.draftStatusValue;
  }
  public get characterIds(): CharacterId[] {
    return [...this.characterIdsValue];
  }
  public get locationId(): LocationId | undefined {
    return this.locationIdValue;
  }
}

// ── Repository Interfaces ───────────────────────────────────────────────────
// Hexagonal ports — infrastructure implements these, domain defines them.

export interface WorkRepository {
  findById(workId: WorkId): Promise<Work | null>;
  findByUniverseId(universeId: UniverseId): Promise<Work[]>;
  save(work: Work): Promise<void>;
}

export interface ChapterRepository {
  findById(chapterId: ChapterId): Promise<Chapter | null>;
  findByWorkId(workId: WorkId): Promise<Chapter[]>;
  save(chapter: Chapter): Promise<void>;
}

export interface SceneRepository {
  findById(sceneId: SceneId): Promise<Scene | null>;
  findByChapterId(chapterId: ChapterId): Promise<Scene[]>;
  save(scene: Scene): Promise<void>;
}

export type IWorkRepository = WorkRepository;
export type IChapterRepository = ChapterRepository;
export type ISceneRepository = SceneRepository;

// ── Domain Events ───────────────────────────────────────────────────────────
// P-EVT-003: carry minimal data — entity ID, type, actor, timestamp.

export interface WorkCreatedEvent {
  eventId: string;
  eventType: "WorkCreated";
  workId: string;
  universeId: string;
  title: string;
  workType: string;
  draftStatus: string;
  canonStatus: string;
  createdBy: string;
  createdAt: string;
}

export interface ChapterCreatedEvent {
  eventId: string;
  eventType: "ChapterCreated";
  chapterId: string;
  workId: string;
  title: string;
  sequenceNumber: number;
  draftStatus: string;
  createdBy: string;
  createdAt: string;
}

export interface SceneCreatedEvent {
  eventId: string;
  eventType: "SceneCreated";
  sceneId: string;
  chapterId: string;
  title: string;
  sequenceNumber: number;
  draftStatus: string;
  characterIds: string[];
  locationId?: string;
  createdBy: string;
  createdAt: string;
}
