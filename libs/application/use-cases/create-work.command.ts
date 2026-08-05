export interface CreateWorkCommand {
  workId?: string;
  universeId: string;
  title: string;
  workType?: string;
  createdBy: string;
}

export interface WorkDTO {
  workId: string;
  universeId: string;
  title: string;
  workType: string;
  draftStatus: string;
  canonStatus: string;
  createdBy: string;
  createdAt: string;
}
