import {
  CreateLocationCommandHandler,
  GetLocationQueryHandler,
  ListChildLocationsQueryHandler,
  ListLocationsByUniverseQueryHandler,
} from "@storyos/application";
import { DomainValidationError } from "@storyos/domain-world-building";
import { KafkaClient, KafkaEventPublisher } from "@storyos/infrastructure-kafka";
import {
  PostgresClient,
  PostgresLocationRepository,
  PostgresUniverseRepository,
} from "@storyos/infrastructure-postgres";
import type { Request, Response } from "express";

export class LocationController {
  private createHandler: CreateLocationCommandHandler;
  private getHandler: GetLocationQueryHandler;
  private listByUniverseHandler: ListLocationsByUniverseQueryHandler;
  private listChildrenHandler: ListChildLocationsQueryHandler;
  private postgresClient: PostgresClient;
  private kafkaClient: KafkaClient;

  constructor(
    createHandler?: CreateLocationCommandHandler,
    getHandler?: GetLocationQueryHandler,
    listByUniverseHandler?: ListLocationsByUniverseQueryHandler,
    listChildrenHandler?: ListChildLocationsQueryHandler,
    postgresClient?: PostgresClient,
    kafkaClient?: KafkaClient,
  ) {
    this.postgresClient = postgresClient || new PostgresClient();
    this.kafkaClient = kafkaClient || new KafkaClient();

    const locationRepo = new PostgresLocationRepository(this.postgresClient);
    const universeRepo = new PostgresUniverseRepository(this.postgresClient);
    const publisher = new KafkaEventPublisher(this.kafkaClient);

    this.createHandler =
      createHandler || new CreateLocationCommandHandler(locationRepo, universeRepo, publisher);
    this.getHandler = getHandler || new GetLocationQueryHandler(locationRepo);
    this.listByUniverseHandler =
      listByUniverseHandler || new ListLocationsByUniverseQueryHandler(locationRepo);
    this.listChildrenHandler =
      listChildrenHandler || new ListChildLocationsQueryHandler(locationRepo);
  }

  // POST /universes/:universeId/locations
  public createLocation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { universeId } = req.params;
      const { name, createdBy, locationId, parentLocationId, locationType } = req.body;

      if (!universeId || !name || !createdBy) {
        res.status(400).json({
          error: "BAD_REQUEST",
          message: "universeId, name, and createdBy are required fields",
        });
        return;
      }

      const result = await this.createHandler.execute({
        locationId,
        universeId,
        parentLocationId,
        name,
        locationType,
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

  // GET /locations/:id
  public getLocationById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          error: "BAD_REQUEST",
          message: "Location ID parameter is required",
        });
        return;
      }

      const result = await this.getHandler.execute({ locationId: id });

      if (!result) {
        res.status(404).json({
          error: "NOT_FOUND",
          message: `Location with ID '${id}' not found`,
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

  // GET /universes/:universeId/locations
  public listLocationsByUniverse = async (req: Request, res: Response): Promise<void> => {
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

  // GET /locations/:id/children
  public listChildLocations = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          error: "BAD_REQUEST",
          message: "Parent Location ID parameter is required",
        });
        return;
      }

      const result = await this.listChildrenHandler.execute({ parentId: id });
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
