import {
  CreateChapterCommandHandler,
  CreateSceneCommandHandler,
  CreateWorkCommandHandler,
  GetWorkQueryHandler,
  ListChaptersByWorkQueryHandler,
  ListScenesByChapterQueryHandler,
} from "@storyos/application";
import { DomainValidationError } from "@storyos/domain-narrative";
import { KafkaClient, KafkaEventPublisher } from "@storyos/infrastructure-kafka";
import {
  PostgresChapterRepository,
  PostgresCharacterRepository,
  PostgresClient,
  PostgresLocationRepository,
  PostgresSceneRepository,
  PostgresUniverseRepository,
  PostgresWorkRepository,
} from "@storyos/infrastructure-postgres";
import type { Request, Response } from "express";

export class NarrativeController {
  private createWorkHandler: CreateWorkCommandHandler;
  private getWorkHandler: GetWorkQueryHandler;
  private createChapterHandler: CreateChapterCommandHandler;
  private listChaptersByWorkHandler: ListChaptersByWorkQueryHandler;
  private createSceneHandler: CreateSceneCommandHandler;
  private listScenesByChapterHandler: ListScenesByChapterQueryHandler;
  private postgresClient: PostgresClient;
  private kafkaClient: KafkaClient;

  constructor(
    createWorkHandler?: CreateWorkCommandHandler,
    getWorkHandler?: GetWorkQueryHandler,
    createChapterHandler?: CreateChapterCommandHandler,
    listChaptersByWorkHandler?: ListChaptersByWorkQueryHandler,
    createSceneHandler?: CreateSceneCommandHandler,
    listScenesByChapterHandler?: ListScenesByChapterQueryHandler,
    postgresClient?: PostgresClient,
    kafkaClient?: KafkaClient,
  ) {
    this.postgresClient = postgresClient ?? new PostgresClient();
    this.kafkaClient = kafkaClient ?? new KafkaClient();

    const workRepo = new PostgresWorkRepository(this.postgresClient);
    const chapterRepo = new PostgresChapterRepository(this.postgresClient);
    const sceneRepo = new PostgresSceneRepository(this.postgresClient);
    const universeRepo = new PostgresUniverseRepository(this.postgresClient);
    const characterRepo = new PostgresCharacterRepository(this.postgresClient);
    const locationRepo = new PostgresLocationRepository(this.postgresClient);
    const publisher = new KafkaEventPublisher(this.kafkaClient);

    this.createWorkHandler =
      createWorkHandler ?? new CreateWorkCommandHandler(workRepo, universeRepo, publisher);
    this.getWorkHandler = getWorkHandler ?? new GetWorkQueryHandler(workRepo);
    this.createChapterHandler =
      createChapterHandler ?? new CreateChapterCommandHandler(chapterRepo, workRepo, publisher);
    this.listChaptersByWorkHandler =
      listChaptersByWorkHandler ?? new ListChaptersByWorkQueryHandler(chapterRepo);
    this.createSceneHandler =
      createSceneHandler ??
      new CreateSceneCommandHandler(sceneRepo, chapterRepo, characterRepo, locationRepo, publisher);
    this.listScenesByChapterHandler =
      listScenesByChapterHandler ?? new ListScenesByChapterQueryHandler(sceneRepo);
  }

  // POST /universes/:universeId/works
  public createWork = async (req: Request, res: Response): Promise<void> => {
    try {
      const { universeId } = req.params;
      const { workId, title, workType, createdBy } = req.body as Record<string, string>;

      if (!universeId || !title || !createdBy) {
        res.status(400).json({
          error: "BAD_REQUEST",
          message: "universeId, title, and createdBy are required fields",
        });
        return;
      }

      const result = await this.createWorkHandler.execute({
        workId,
        universeId,
        title,
        workType,
        createdBy,
      });

      res.status(201).json(result);
    } catch (err: unknown) {
      this.handleError(err, res);
    }
  };

  // GET /works/:id
  public getWorkById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "BAD_REQUEST", message: "Work ID parameter is required" });
        return;
      }

      const result = await this.getWorkHandler.execute({ workId: id });
      if (!result) {
        res.status(404).json({ error: "NOT_FOUND", message: `Work with ID '${id}' not found` });
        return;
      }

      res.status(200).json(result);
    } catch (err: unknown) {
      this.handleError(err, res);
    }
  };

  // POST /works/:workId/chapters
  public createChapter = async (req: Request, res: Response): Promise<void> => {
    try {
      const { workId } = req.params;
      const { chapterId, title, sequenceNumber, createdBy } = req.body as Record<string, string>;

      if (!workId || !title || !createdBy) {
        res.status(400).json({
          error: "BAD_REQUEST",
          message: "workId, title, and createdBy are required fields",
        });
        return;
      }

      const result = await this.createChapterHandler.execute({
        chapterId,
        workId,
        title,
        sequenceNumber: sequenceNumber ? Number(sequenceNumber) : undefined,
        createdBy,
      });

      res.status(201).json(result);
    } catch (err: unknown) {
      this.handleError(err, res);
    }
  };

  // GET /works/:workId/chapters
  public listChaptersByWork = async (req: Request, res: Response): Promise<void> => {
    try {
      const { workId } = req.params;
      if (!workId) {
        res.status(400).json({ error: "BAD_REQUEST", message: "Work ID parameter is required" });
        return;
      }

      const result = await this.listChaptersByWorkHandler.execute({ workId });
      res.status(200).json(result);
    } catch (err: unknown) {
      this.handleError(err, res);
    }
  };

  // POST /chapters/:chapterId/scenes
  public createScene = async (req: Request, res: Response): Promise<void> => {
    try {
      const { chapterId } = req.params;
      const { sceneId, title, sequenceNumber, characterIds, locationId, createdBy } = req.body as {
        sceneId?: string;
        title: string;
        sequenceNumber?: number;
        characterIds?: string[];
        locationId?: string;
        createdBy: string;
      };

      if (!chapterId || !title || !createdBy) {
        res.status(400).json({
          error: "BAD_REQUEST",
          message: "chapterId, title, and createdBy are required fields",
        });
        return;
      }

      const result = await this.createSceneHandler.execute({
        sceneId,
        chapterId,
        title,
        sequenceNumber,
        characterIds,
        locationId,
        createdBy,
      });

      res.status(201).json(result);
    } catch (err: unknown) {
      this.handleError(err, res);
    }
  };

  // GET /chapters/:chapterId/scenes
  public listScenesByChapter = async (req: Request, res: Response): Promise<void> => {
    try {
      const { chapterId } = req.params;
      if (!chapterId) {
        res.status(400).json({ error: "BAD_REQUEST", message: "Chapter ID parameter is required" });
        return;
      }

      const result = await this.listScenesByChapterHandler.execute({ chapterId });
      res.status(200).json(result);
    } catch (err: unknown) {
      this.handleError(err, res);
    }
  };

  public close = async (): Promise<void> => {
    await Promise.allSettled([this.postgresClient.close(), this.kafkaClient.close()]);
  };

  private handleError(err: unknown, res: Response): void {
    if (err instanceof DomainValidationError) {
      res.status(422).json({
        error: "DOMAIN_VALIDATION_ERROR",
        field: err.field,
        rule: err.rule,
        message: err.message,
      });
      return;
    }
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: errorMessage });
  }
}
