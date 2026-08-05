import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./api-client.js";

describe("API Client (apps/web-app/src/lib/api-client.ts)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches universe by ID", async () => {
    const mockUniverse = {
      universeId: "uni_100",
      organizationId: "org_100",
      title: "Camelot",
      createdBy: "usr_100",
      createdAt: "2026-08-04T12:00:00.000Z",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockUniverse),
    } as any);

    const result = await apiClient.getUniverseById("uni_100");

    expect(result.universeId).toBe("uni_100");
    expect(result.title).toBe("Camelot");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/universes/uni_100",
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
  });

  it("throws error with message when HTTP request fails", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: vi.fn().mockResolvedValue({
        error: "DOMAIN_VALIDATION_ERROR",
        message: "Character with ID 'char_missing' does not exist",
      }),
    } as any);

    await expect(
      apiClient.createRelationship("uni_100", {
        sourceCharacterId: "char_missing",
        targetCharacterId: "char_2",
        relationshipType: "ALLY",
        createdBy: "usr_100",
      }),
    ).rejects.toThrow("Character with ID 'char_missing' does not exist");
  });
});
