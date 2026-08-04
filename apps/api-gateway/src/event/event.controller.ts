import {
  CreateEventCommandHandler,
  GetEventQueryHandler,
  ListEventsByCharacterQueryHandler,
  ListEventsByUniverseQueryHandler,
} from "@storyos/application";
import { DomainValidationError } from "@storyos/domain-timeline";
import { KafkaClient, KafkaEventPublisher } from "@storyos/infrastructure-kafka";
import {
  PostgresCharacterRepository,
  PostgresClient,
  PostgresEventRepository,
  PostgresLocationRepository,
  PostgresUniverseRepository,
} from "@storyos/infrastructure-postgres";
import type { Request, Response } from "express";

export class EventController {
  private createHandler: CreateEventCommandHandler;
  private getHandler: GetEventQueryHandler;
  private listByUniverseHandler: ListEventsByUniverseQueryHandler;
  private listByCharacterHandler: ListEventsByCharacterQueryHandler;
  private postgresClient: PostgresClient;
  private kafkaClient: KafkaClient;

  constructor(
    createHandler?: CreateEventCommandHandler,
    getHandler?: GetEventQueryHandler,
    listByUniverseHandler?: ListEventsByUniverseQueryHandler,
    listByCharacterHandler?: ListEventsByCharacterQueryHandler,
    postgresClient?: PostgresClient,
    kafkaClient?: KafkaClient,
  ) {
    this.postgresClient = postgresClient || new PostgresClient();
    this.kafkaClient = kafkaClient || new KafkaClient();

    const eventRepo = new PostgresEventRepository(this.postgresClient);
    const universeRepo = new PostgresUniverseRepository(this.postgresClient);
    const characterRepo = new PostgresCharacterRepository(this.postgresClient);
    const locationRepo = new PostgresLocationRepository(this.postgresClient);
    const publisher = new KafkaEventPublisher(this.kafkaClient);

    this.createHandler =
      createHandler ||
      new CreateEventCommandHandler(
        eventRepo,
        universeRepo,
        characterRepo,
        locationRepo,
        publisher,
      );
    this.getHandler = getHandler || new GetEventQueryHandler(eventRepo);
    this.listByUniverseHandler =
      listByUniverseHandler || new ListEventsByUniverseQueryHandler(eventRepo);
    this.listByCharacterHandler =
      listByCharacterHandler || new ListEventsByCharacterQueryHandler(eventRepo);
  }

  // POST /universes/:universeId/events
  public createEvent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { universeId } = req.params;
      const { title, description, locationId, status, participants, createdBy, eventId } = req.body;

      if (!universeId || !title || !description || !createdBy) {
        res.status(400).json({
          error: "BAD_REQUEST",
          message: "universeId, title, description, and createdBy are required fields",
        });
        return;
      }

      const result = await this.createHandler.execute({
        eventId,
        universeId,
        title,
        description,
        locationId,
        status,
        participants,
        createdBy,
      });

      res.status(201).json(result);
    } catch (err: unknown) {
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
      res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
        message: errorMessage,
      });
    }
  };

  // GET /events/:id
  public getEventById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          error: "BAD_REQUEST",
          message: "Event ID parameter is required",
        });
        return;
      }

      const result = await this.getHandler.execute({ eventId: id });

      if (!result) {
        res.status(404).json({
          error: "NOT_FOUND",
          message: `Event with ID '${id}' not found`,
        });
        return;
      }

      res.status(200).json(result);
    } catch (err: unknown) {
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
      res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
        message: errorMessage,
      });
    }
  };

  // GET /universes/:universeId/events
  public listEventsByUniverse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { universeId } = req.params;
      if (!universeId) {
        res.status(400).json({
          error: "BAD_REQUEST",
          message: "Universe ID parameter is required",
        });
        return;
      }

      const result = await this.listByUniverseHandler.execute({ universeId });
      res.status(200).json(result);
    } catch (err: unknown) {
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
      res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
        message: errorMessage,
      });
    }
  };

  // GET /characters/:characterId/events
  public listEventsByCharacter = async (req: Request, res: Response): Promise<void> => {
    try {
      const { characterId } = req.params;
      if (!characterId) {
        res.status(400).json({
          error: "BAD_REQUEST",
          message: "Character ID parameter is required",
        });
        return;
      }

      const result = await this.listByCharacterHandler.execute({ characterId });
      res.status(200).json(result);
    } catch (err: unknown) {
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
      res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
        message: errorMessage,
      });
    }
  };

  public close = async (): Promise<void> => {
    await Promise.allSettled([this.postgresClient.close(), this.kafkaClient.close()]);
  };
}
