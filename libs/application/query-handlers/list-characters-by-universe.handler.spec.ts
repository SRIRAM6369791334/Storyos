import {
  Character,
  CharacterName,
  createCharacterId,
  createUniverseId,
  createUserId,
} from "@storyos/domain-character";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListCharactersByUniverseQueryHandler } from "./list-characters-by-universe.handler.js";

describe("ListCharactersByUniverseQueryHandler", () => {
  let mockCharRepo: any;
  let handler: ListCharactersByUniverseQueryHandler;

  beforeEach(() => {
    mockCharRepo = {
      findById: vi.fn(),
      findByUniverseId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    handler = new ListCharactersByUniverseQueryHandler(mockCharRepo);
  });

  it("returns array of CharacterDTOs for a given universeId", async () => {
    const mockChars = [
      Character.create({
        characterId: createCharacterId("char_1"),
        universeId: createUniverseId("uni_list_1"),
        primaryName: CharacterName.create("Arthur"),
        createdBy: createUserId("usr_1"),
      }),
      Character.create({
        characterId: createCharacterId("char_2"),
        universeId: createUniverseId("uni_list_1"),
        primaryName: CharacterName.create("Lancelot"),
        createdBy: createUserId("usr_1"),
      }),
    ];

    mockCharRepo.findByUniverseId.mockResolvedValue(mockChars);

    const result = await handler.execute({ universeId: "uni_list_1" });

    expect(result).toHaveLength(2);
    expect(result[0]?.characterId).toBe("char_1");
    expect(result[0]?.primaryName).toBe("Arthur");
    expect(result[1]?.characterId).toBe("char_2");
    expect(result[1]?.primaryName).toBe("Lancelot");

    expect(mockCharRepo.findByUniverseId).toHaveBeenCalledWith("uni_list_1");
  });

  it("returns empty array if no characters found for universeId", async () => {
    mockCharRepo.findByUniverseId.mockResolvedValue([]);

    const result = await handler.execute({ universeId: "uni_empty" });

    expect(result).toEqual([]);
    expect(mockCharRepo.findByUniverseId).toHaveBeenCalledWith("uni_empty");
  });
});
