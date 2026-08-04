import { describe, expect, it } from "vitest";
import {
  CanonStatus,
  Character,
  CharacterName,
  CharacterStatus,
  DomainValidationError,
  createCharacterId,
  createUniverseId,
  createUserId,
} from "./index.js";

const validName = (): CharacterName => CharacterName.create("Arya Stark");
const validCharacter = (): Character => {
  return Character.create({
    characterId: createCharacterId("char_1"),
    universeId: createUniverseId("uni_1"),
    primaryName: validName(),
    createdBy: createUserId("usr_1"),
  });
};

describe("CharacterId", () => {
  it("rejects an empty identifier", () => {
    expect(() => createCharacterId("  ")).toThrow(DomainValidationError);
  });
});

describe("CharacterName (Value Object)", () => {
  it("accepts a valid name", () => {
    expect(validName().toString()).toBe("Arya Stark");
  });

  it("rejects an empty name", () => {
    expect(() => CharacterName.create("")).toThrow(DomainValidationError);
  });

  it("rejects a name longer than 300 characters", () => {
    expect(() => CharacterName.create("A".repeat(301))).toThrow(DomainValidationError);
  });

  it("rejects a name containing control characters", () => {
    expect(() => CharacterName.create("Arya\u0000Stark")).toThrow(DomainValidationError);
  });
});

describe("Character (Aggregate Root)", () => {
  it("creates a character with default DRAFT states", () => {
    const character = validCharacter();

    expect(character.primaryName.toString()).toBe("Arya Stark");
    expect(character.status).toBe(CharacterStatus.DRAFT);
    expect(character.canonStatus).toBe(CanonStatus.DRAFT);
    expect(character.createdAt).toBeInstanceOf(Date);
  });

  it("accepts explicit status and canon status at creation", () => {
    const character = Character.create({
      characterId: createCharacterId("char_2"),
      universeId: createUniverseId("uni_1"),
      primaryName: validName(),
      createdBy: createUserId("usr_1"),
      status: CharacterStatus.ACTIVE,
      canonStatus: CanonStatus.PENDING,
    });

    expect(character.status).toBe(CharacterStatus.ACTIVE);
    expect(character.canonStatus).toBe(CanonStatus.PENDING);
  });

  it("rename() updates the primary name", () => {
    const character = validCharacter();
    const newName = CharacterName.create("No One");

    character.rename(newName);

    expect(character.primaryName.toString()).toBe("No One");
  });

  it("rename() rejects a change to a CANON character", () => {
    const character = Character.create({
      characterId: createCharacterId("char_3"),
      universeId: createUniverseId("uni_1"),
      primaryName: validName(),
      createdBy: createUserId("usr_1"),
      canonStatus: CanonStatus.CANON,
    });

    expect(() => character.rename(CharacterName.create("Renamed"))).toThrow(DomainValidationError);
  });

  it("archive() transitions the character to ARCHIVED", () => {
    const character = validCharacter();

    character.archive();

    expect(character.status).toBe(CharacterStatus.ARCHIVED);
  });

  it("archive() rejects re-archiving a terminal character", () => {
    const character = validCharacter();
    character.archive();

    expect(() => character.archive()).toThrow(DomainValidationError);
  });
});
