import type { WorkRepository } from "@storyos/domain-narrative";
import { createWorkId } from "@storyos/domain-narrative";
import type { GetWorkQuery, WorkDTO } from "../use-cases/get-work.query.js";

export class GetWorkQueryHandler {
  private workRepo: WorkRepository;

  constructor(workRepo: WorkRepository) {
    this.workRepo = workRepo;
  }

  public async execute(query: GetWorkQuery): Promise<WorkDTO | null> {
    const workId = createWorkId(query.workId);
    const work = await this.workRepo.findById(workId);
    if (!work) return null;

    return {
      workId: work.workId,
      universeId: work.universeId,
      title: work.title.toString(),
      workType: work.workType,
      draftStatus: work.draftStatus,
      canonStatus: work.canonStatus,
      createdBy: work.createdBy,
      createdAt: work.createdAt.toISOString(),
    };
  }
}
