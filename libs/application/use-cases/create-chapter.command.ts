export interface CreateChapterCommand {
  chapterId?: string;
  workId: string;
  title: string;
  sequenceNumber?: number;
  createdBy: string;
}

export interface ChapterDTO {
  chapterId: string;
  workId: string;
  title: string;
  sequenceNumber: number;
  draftStatus: string;
  createdBy: string;
  createdAt: string;
}
