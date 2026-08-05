import type { SceneRepository } from "@storyos/domain-narrative";
import { createChapterId } from "@storyos/domain-narrative";
import type {
  ListScenesByChapterQuery,
  SceneDTO,
} from "../use-cases/list-scenes-by-chapter.query.js";

export class ListScenesByChapterQueryHandler {
  private sceneRepo: SceneRepository;

  constructor(sceneRepo: SceneRepository) {
    this.sceneRepo = sceneRepo;
  }

  public async execute(query: ListScenesByChapterQuery): Promise<SceneDTO[]> {
    const chapterId = createChapterId(query.chapterId);
    const scenes = await this.sceneRepo.findByChapterId(chapterId);

    return scenes.map((scene) => ({
      sceneId: scene.sceneId,
      chapterId: scene.chapterId,
      title: scene.title.toString(),
      sequenceNumber: scene.sequenceNumber,
      draftStatus: scene.draftStatus,
      characterIds: scene.characterIds,
      locationId: scene.locationId,
      createdBy: scene.createdBy,
      createdAt: scene.createdAt.toISOString(),
    }));
  }
}
