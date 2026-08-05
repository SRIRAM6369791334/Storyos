import type { CharacterRepository } from "@storyos/domain-character";
import {
  type ChapterRepository,
  DomainValidationError,
  Scene,
  type SceneCreatedEvent,
  type SceneRepository,
  SceneTitle,
  createChapterId,
  createCharacterId,
  createLocationId,
  createSceneId,
  createUserId,
} from "@storyos/domain-narrative";
import type { IEventPublisher } from "@storyos/domain-universe";
import type { LocationRepository } from "@storyos/domain-world-building";
import type { CreateSceneCommand, SceneDTO } from "../use-cases/create-scene.command.js";

export class CreateSceneCommandHandler {
  private sceneRepo: SceneRepository;
  private chapterRepo: ChapterRepository;
  private characterRepo?: CharacterRepository;
  private locationRepo?: LocationRepository;
  private eventPublisher?: IEventPublisher;

  constructor(
    sceneRepo: SceneRepository,
    chapterRepo: ChapterRepository,
    characterRepo?: CharacterRepository,
    locationRepo?: LocationRepository,
    eventPublisher?: IEventPublisher,
  ) {
    this.sceneRepo = sceneRepo;
    this.chapterRepo = chapterRepo;
    this.characterRepo = characterRepo;
    this.locationRepo = locationRepo;
    this.eventPublisher = eventPublisher;
  }

  public async execute(command: CreateSceneCommand): Promise<SceneDTO> {
    const chapterId = createChapterId(command.chapterId);

    // Validate Chapter existence
    const chapter = await this.chapterRepo.findById(chapterId);
    if (!chapter) {
      throw new DomainValidationError(
        "chapterId",
        "NOT_FOUND",
        `Chapter with ID '${command.chapterId}' does not exist`,
      );
    }

    // Cross-domain validation: characters must exist (if repos provided)
    const characterIds = (command.characterIds ?? []).map((id) => createCharacterId(id));
    if (this.characterRepo && characterIds.length > 0) {
      for (const charId of characterIds) {
        const char = await this.characterRepo.findById(charId);
        if (!char) {
          throw new DomainValidationError(
            "characterIds",
            "NOT_FOUND",
            `Character with ID '${charId}' does not exist`,
          );
        }
      }
    }

    // Cross-domain validation: location must exist (if repos provided)
    const locationId = command.locationId ? createLocationId(command.locationId) : undefined;
    if (this.locationRepo && locationId) {
      const loc = await this.locationRepo.findById(locationId);
      if (!loc) {
        throw new DomainValidationError(
          "locationId",
          "NOT_FOUND",
          `Location with ID '${command.locationId}' does not exist`,
        );
      }
    }

    const sceneIdStr =
      command.sceneId && command.sceneId.trim().length > 0
        ? command.sceneId
        : `scene_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const sceneId = createSceneId(sceneIdStr);
    const title = SceneTitle.create(command.title);
    const createdBy = createUserId(command.createdBy);

    const scene = Scene.create({
      sceneId,
      chapterId,
      title,
      createdBy,
      sequenceNumber: command.sequenceNumber,
      characterIds,
      locationId,
    });

    await this.sceneRepo.save(scene);

    if (this.eventPublisher) {
      const event: SceneCreatedEvent = {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        eventType: "SceneCreated",
        sceneId: scene.sceneId,
        chapterId: scene.chapterId,
        title: scene.title.toString(),
        sequenceNumber: scene.sequenceNumber,
        draftStatus: scene.draftStatus,
        characterIds: scene.characterIds,
        locationId: scene.locationId,
        createdBy: scene.createdBy,
        createdAt: scene.createdAt.toISOString(),
      };
      await this.eventPublisher.publish(
        "narrative-events",
        event as unknown as Record<string, unknown>,
      );
    }

    return {
      sceneId: scene.sceneId,
      chapterId: scene.chapterId,
      title: scene.title.toString(),
      sequenceNumber: scene.sequenceNumber,
      draftStatus: scene.draftStatus,
      characterIds: scene.characterIds,
      locationId: scene.locationId,
      createdBy: scene.createdBy,
      createdAt: scene.createdAt.toISOString(),
    };
  }
}
