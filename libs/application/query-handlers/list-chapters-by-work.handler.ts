import type { ChapterRepository } from "@storyos/domain-narrative";
import { createWorkId } from "@storyos/domain-narrative";
import type {
  ChapterDTO,
  ListChaptersByWorkQuery,
} from "../use-cases/list-chapters-by-work.query.js";

export class ListChaptersByWorkQueryHandler {
  private chapterRepo: ChapterRepository;

  constructor(chapterRepo: ChapterRepository) {
    this.chapterRepo = chapterRepo;
  }

  public async execute(query: ListChaptersByWorkQuery): Promise<ChapterDTO[]> {
    const workId = createWorkId(query.workId);
    const chapters = await this.chapterRepo.findByWorkId(workId);

    return chapters.map((chapter) => ({
      chapterId: chapter.chapterId,
      workId: chapter.workId,
      title: chapter.title.toString(),
      sequenceNumber: chapter.sequenceNumber,
      draftStatus: chapter.draftStatus,
      createdBy: chapter.createdBy,
      createdAt: chapter.createdAt.toISOString(),
    }));
  }
}
