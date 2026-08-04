import { describe, expect, it } from "vitest";
import {
  AudienceClassification,
  DomainValidationError,
  GenreClassification,
  MaturityRating,
  MediumType,
  StoryUniverse,
  UniverseStatus,
  UniverseSynopsis,
  UniverseTitle,
  createOrganizationId,
  createUniverseId,
  createUserId,
} from "./index.js";

const validTitle = (): UniverseTitle => UniverseTitle.create("The Shattered Realms");
const validUniverse = (): StoryUniverse => {
  return StoryUniverse.create({
    universeId: createUniverseId("uni_1"),
    organizationId: createOrganizationId("org_1"),
    title: validTitle(),
    createdBy: createUserId("usr_1"),
  });
};

describe("UniverseId and OrganizationId", () => {
  it("rejects an empty universe identifier", () => {
    expect(() => createUniverseId("  ")).toThrow(DomainValidationError);
  });

  it("rejects an empty organization identifier", () => {
    expect(() => createOrganizationId("  ")).toThrow(DomainValidationError);
  });
});

describe("UniverseTitle (Value Object)", () => {
  it("accepts a valid title", () => {
    expect(validTitle().toString()).toBe("The Shattered Realms");
  });

  it("rejects an empty title", () => {
    expect(() => UniverseTitle.create("")).toThrow(DomainValidationError);
  });

  it("rejects a title longer than 200 characters", () => {
    expect(() => UniverseTitle.create("A".repeat(201))).toThrow(DomainValidationError);
  });

  it("rejects a title containing control characters", () => {
    expect(() => UniverseTitle.create("Realms\u0000Beyond")).toThrow(DomainValidationError);
  });
});

describe("UniverseSynopsis (Value Object)", () => {
  it("accepts a valid synopsis", () => {
    expect(UniverseSynopsis.create("A world divided by war.").toString()).toBe(
      "A world divided by war.",
    );
  });

  it("accepts an empty synopsis", () => {
    expect(UniverseSynopsis.create("").toString()).toBe("");
  });

  it("rejects a synopsis longer than 2000 characters", () => {
    expect(() => UniverseSynopsis.create("A".repeat(2001))).toThrow(DomainValidationError);
  });

  it("rejects a synopsis containing control characters", () => {
    expect(() => UniverseSynopsis.create("A world\u0000divided")).toThrow(DomainValidationError);
  });
});

describe("StoryUniverse (Aggregate Root)", () => {
  it("creates a universe with default DRAFT status and empty optional collections", () => {
    const universe = validUniverse();

    expect(universe.title.toString()).toBe("The Shattered Realms");
    expect(universe.status).toBe(UniverseStatus.DRAFT);
    expect(universe.genre).toEqual([]);
    expect(universe.linkedUniverseIds).toEqual([]);
    expect(universe.createdAt).toBeInstanceOf(Date);
  });

  it("accepts explicit status and optional attributes at creation", () => {
    const universe = StoryUniverse.create({
      universeId: createUniverseId("uni_2"),
      organizationId: createOrganizationId("org_1"),
      title: validTitle(),
      createdBy: createUserId("usr_1"),
      status: UniverseStatus.ACTIVE,
      synopsis: UniverseSynopsis.create("A world divided by war."),
      genre: [GenreClassification.FANTASY, GenreClassification.ADVENTURE],
      primaryMedium: MediumType.NOVEL,
      targetAudience: AudienceClassification.YOUNG_ADULT,
      maturityRating: MaturityRating.TEEN,
      linkedUniverseIds: [createUniverseId("uni_3")],
    });

    expect(universe.status).toBe(UniverseStatus.ACTIVE);
    expect(universe.synopsis?.toString()).toBe("A world divided by war.");
    expect(universe.genre).toEqual([GenreClassification.FANTASY, GenreClassification.ADVENTURE]);
    expect(universe.primaryMedium).toBe(MediumType.NOVEL);
    expect(universe.targetAudience).toBe(AudienceClassification.YOUNG_ADULT);
    expect(universe.maturityRating).toBe(MaturityRating.TEEN);
    expect(universe.linkedUniverseIds).toEqual([createUniverseId("uni_3")]);
  });

  it("genre getter returns a copy so callers cannot mutate aggregate state", () => {
    const universe = StoryUniverse.create({
      universeId: createUniverseId("uni_4"),
      organizationId: createOrganizationId("org_1"),
      title: validTitle(),
      createdBy: createUserId("usr_1"),
      genre: [GenreClassification.DRAMA],
    });

    universe.genre.push(GenreClassification.HORROR);

    expect(universe.genre).toEqual([GenreClassification.DRAMA]);
  });

  it("rename() updates the title", () => {
    const universe = validUniverse();
    const newTitle = UniverseTitle.create("The Renewed Realms");

    universe.rename(newTitle);

    expect(universe.title.toString()).toBe("The Renewed Realms");
  });

  it("rename() rejects a change to an ARCHIVED universe", () => {
    const universe = validUniverse();
    universe.archive(createUserId("usr_2"));

    expect(() => universe.rename(UniverseTitle.create("Renamed"))).toThrow(DomainValidationError);
  });

  it("activate() transitions the universe from DRAFT to ACTIVE", () => {
    const universe = validUniverse();

    universe.activate();

    expect(universe.status).toBe(UniverseStatus.ACTIVE);
  });

  it("activate() rejects re-activating an ACTIVE universe", () => {
    const universe = validUniverse();
    universe.activate();

    expect(() => universe.activate()).toThrow(DomainValidationError);
  });

  it("activate() rejects transitioning from ARCHIVED", () => {
    const universe = validUniverse();
    universe.archive(createUserId("usr_2"));

    expect(() => universe.activate()).toThrow(DomainValidationError);
  });

  it("archive() records the archiver and timestamp", () => {
    const universe = validUniverse();
    const archiver = createUserId("usr_2");

    universe.archive(archiver);

    expect(universe.status).toBe(UniverseStatus.ARCHIVED);
    expect(universe.archivedBy).toBe(archiver);
    expect(universe.archivedAt).toBeInstanceOf(Date);
  });

  it("archive() rejects re-archiving a terminal universe", () => {
    const universe = validUniverse();
    universe.archive(createUserId("usr_2"));

    expect(() => universe.archive(createUserId("usr_3"))).toThrow(DomainValidationError);
  });
});
