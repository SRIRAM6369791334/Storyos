import {
  Chapter,
  type ChapterCreatedEvent,
  type ChapterRepository,
  ChapterTitle,
  DomainValidationError,
  type WorkRepository,
  createChapterId,
  createUserId,
  createWorkId,
} from "@storyos/domain-narrative";
import type { IEventPublisher } from "@storyos/domain-universe";
import type { ChapterDTO, CreateChapterCommand } from "../use-cases/create-chapter.command.js";

export class CreateChapterCommandHandler {
  private chapterRepo: ChapterRepository;
  private workRepo: WorkRepository;
  private eventPublisher?: IEventPublisher;

  constructor(
    chapterRepo: ChapterRepository,
    workRepo: WorkRepository,
    eventPublisher?: IEventPublisher,
  ) {
    this.chapterRepo = chapterRepo;
    this.workRepo = workRepo;
    this.eventPublisher = eventPublisher;
  }

  public async execute(command: CreateChapterCommand): Promise<ChapterDTO> {
    const workId = createWorkId(command.workId);

    // Validate Work existence
    const workExists = await this.workRepo.findById(workId);
    if (!workExists) {
      throw new DomainValidationError(
        "workId",
        "NOT_FOUND",
        `Work with ID '${command.workId}' does not exist`,
      );
    }

    const chapterIdStr =
      command.chapterId && command.chapterId.trim().length > 0
        ? command.chapterId
        : `chap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const chapterId = createChapterId(chapterIdStr);
    const title = ChapterTitle.create(command.title);
    const createdBy = createUserId(command.createdBy);

    const chapter = Chapter.create({
      chapterId,
      workId,
      title,
      createdBy,
      sequenceNumber: command.sequenceNumber,
    });

    await this.chapterRepo.save(chapter);

    if (this.eventPublisher) {
      const event: ChapterCreatedEvent = {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        eventType: "ChapterCreated",
        chapterId: chapter.chapterId,
        workId: chapter.workId,
        title: chapter.title.toString(),
        sequenceNumber: chapter.sequenceNumber,
        draftStatus: chapter.draftStatus,
        createdBy: chapter.createdBy,
        createdAt: chapter.createdAt.toISOString(),
      };
      await this.eventPublisher.publish(
        "narrative-events",
        event as unknown as Record<string, unknown>,
      );
    }

    return {
      chapterId: chapter.chapterId,
      workId: chapter.workId,
      title: chapter.title.toString(),
      sequenceNumber: chapter.sequenceNumber,
      draftStatus: chapter.draftStatus,
      createdBy: chapter.createdBy,
      createdAt: chapter.createdAt.toISOString(),
    };
  }
}
