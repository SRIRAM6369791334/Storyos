import { type UniverseRepository, createUniverseId } from "@storyos/domain-universe";
import type { UniverseDTO } from "../use-cases/create-universe.command.js";
import type { GetUniverseQuery } from "../use-cases/get-universe.query.js";

export class GetUniverseQueryHandler {
  private repository: UniverseRepository;

  constructor(repository: UniverseRepository) {
    this.repository = repository;
  }

  public async execute(query: GetUniverseQuery): Promise<UniverseDTO | null> {
    const universeId = createUniverseId(query.universeId);
    const universe = await this.repository.findById(universeId);

    if (!universe) {
      return null;
    }

    return {
      universeId: universe.universeId,
      organizationId: universe.organizationId,
      title: universe.title.toString(),
      status: universe.status,
      createdBy: universe.createdBy,
      createdAt: universe.createdAt.toISOString(),
      synopsis: universe.synopsis?.toString(),
      genre: universe.genre,
      primaryMedium: universe.primaryMedium,
      targetAudience: universe.targetAudience,
      maturityRating: universe.maturityRating,
      linkedUniverseIds: universe.linkedUniverseIds,
      archivedAt: universe.archivedAt?.toISOString(),
      archivedBy: universe.archivedBy,
    };
  }
}
