import {
  StoryUniverse,
  UniverseTitle,
  createOrganizationId,
  createUniverseId,
  createUserId,
} from "@storyos/domain-universe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetUniverseQueryHandler } from "./get-universe.handler.js";

describe("GetUniverseQueryHandler", () => {
  let mockRepo: any;
  let handler: GetUniverseQueryHandler;

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    handler = new GetUniverseQueryHandler(mockRepo);
  });

  it("returns UniverseDTO when universe is found", async () => {
    const mockUniverse = StoryUniverse.create({
      universeId: createUniverseId("uni_found"),
      organizationId: createOrganizationId("org_found"),
      title: UniverseTitle.create("Found Universe"),
      createdBy: createUserId("usr_found"),
    });

    mockRepo.findById.mockResolvedValue(mockUniverse);

    const result = await handler.execute({ universeId: "uni_found" });

    expect(result).not.toBeNull();
    expect(result?.universeId).toBe("uni_found");
    expect(result?.title).toBe("Found Universe");
    expect(mockRepo.findById).toHaveBeenCalledWith("uni_found");
  });

  it("returns null when universe is not found", async () => {
    mockRepo.findById.mockResolvedValue(null);

    const result = await handler.execute({ universeId: "uni_missing" });

    expect(result).toBeNull();
    expect(mockRepo.findById).toHaveBeenCalledWith("uni_missing");
  });
});
