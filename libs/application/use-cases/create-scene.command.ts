export interface CreateSceneCommand {
  sceneId?: string;
  chapterId: string;
  title: string;
  sequenceNumber?: number;
  characterIds?: string[];
  locationId?: string;
  createdBy: string;
}

export interface SceneDTO {
  sceneId: string;
  chapterId: string;
  title: string;
  sequenceNumber: number;
  draftStatus: string;
  characterIds: string[];
  locationId?: string;
  createdBy: string;
  createdAt: string;
}
