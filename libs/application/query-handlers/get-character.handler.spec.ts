import {
  Character,
  CharacterName,
  createCharacterId,
  createUniverseId,
  createUserId,
} from "@storyos/domain-character";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetCharacterQueryHandler } from "./get-character.handler.js";

describe("GetCharacterQueryHandler", () => {
  let mockCharRepo: any;
  let handler: GetCharacterQueryHandler;

  beforeEach(() => {
    mockCharRepo = {
      findById: vi.fn(),
      findByUniverseId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    handler = new GetCharacterQueryHandler(mockCharRepo);
  });

  it("returns CharacterDTO when character is found", async () => {
    const mockCharacter = Character.create({
      characterId: createCharacterId("char_found_1"),
      universeId: createUniverseId("uni_found_1"),
      primaryName: CharacterName.create("Merlin Ambrosius"),
      createdBy: createUserId("usr_1"),
    });

    mockCharRepo.findById.mockResolvedValue(mockCharacter);

    const result = await handler.execute({ characterId: "char_found_1" });

    expect(result).not.toBeNull();
    expect(result?.characterId).toBe("char_found_1");
    expect(result?.primaryName).toBe("Merlin Ambrosius");
    expect(mockCharRepo.findById).toHaveBeenCalledWith("char_found_1");
  });

  it("returns null when character is not found", async () => {
    mockCharRepo.findById.mockResolvedValue(null);

    const result = await handler.execute({ characterId: "char_missing" });

    expect(result).toBeNull();
    expect(mockCharRepo.findById).toHaveBeenCalledWith("char_missing");
  });
});
