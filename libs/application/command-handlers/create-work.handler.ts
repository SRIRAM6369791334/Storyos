import {
  DomainValidationError,
  Work,
  type WorkCreatedEvent,
  type WorkRepository,
  WorkTitle,
  createUniverseId,
  createUserId,
  createWorkId,
} from "@storyos/domain-narrative";
import type { UniverseRepository } from "@storyos/domain-universe";
import type { IEventPublisher } from "@storyos/domain-universe";
import type { CreateWorkCommand, WorkDTO } from "../use-cases/create-work.command.js";

export class CreateWorkCommandHandler {
  private workRepo: WorkRepository;
  private universeRepo: UniverseRepository;
  private eventPublisher?: IEventPublisher;

  constructor(
    workRepo: WorkRepository,
    universeRepo: UniverseRepository,
    eventPublisher?: IEventPublisher,
  ) {
    this.workRepo = workRepo;
    this.universeRepo = universeRepo;
    this.eventPublisher = eventPublisher;
  }

  public async execute(command: CreateWorkCommand): Promise<WorkDTO> {
    const universeId = createUniverseId(command.universeId);

    // Validate Universe existence (REF-002: references validated at write time)
    const universeExists = await this.universeRepo.findById(universeId);
    if (!universeExists) {
      throw new DomainValidationError(
        "universeId",
        "NOT_FOUND",
        `Universe with ID '${command.universeId}' does not exist`,
      );
    }

    const workIdStr =
      command.workId && command.workId.trim().length > 0
        ? command.workId
        : `work_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const workId = createWorkId(workIdStr);
    const title = WorkTitle.create(command.title);
    const createdBy = createUserId(command.createdBy);

    const work = Work.create({
      workId,
      universeId,
      title,
      createdBy,
    });

    await this.workRepo.save(work);

    if (this.eventPublisher) {
      const event: WorkCreatedEvent = {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        eventType: "WorkCreated",
        workId: work.workId,
        universeId: work.universeId,
        title: work.title.toString(),
        workType: work.workType,
        draftStatus: work.draftStatus,
        canonStatus: work.canonStatus,
        createdBy: work.createdBy,
        createdAt: work.createdAt.toISOString(),
      };
      await this.eventPublisher.publish(
        "narrative-events",
        event as unknown as Record<string, unknown>,
      );
    }

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
