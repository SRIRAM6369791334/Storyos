import {
  CreateCharacterCommandHandler,
  GetCharacterQueryHandler,
  ListCharactersByUniverseQueryHandler,
} from "@storyos/application";
import { DomainValidationError } from "@storyos/domain-character";
import { KafkaClient, KafkaEventPublisher } from "@storyos/infrastructure-kafka";
import {
  PostgresCharacterRepository,
  PostgresClient,
  PostgresUniverseRepository,
} from "@storyos/infrastructure-postgres";
import type { Request, Response } from "express";

export class CharacterController {
  private createHandler: CreateCharacterCommandHandler;
  private getHandler: GetCharacterQueryHandler;
  private listHandler: ListCharactersByUniverseQueryHandler;
  private postgresClient: PostgresClient;
  private kafkaClient: KafkaClient;

  constructor(
    createHandler?: CreateCharacterCommandHandler,
    getHandler?: GetCharacterQueryHandler,
    listHandler?: ListCharactersByUniverseQueryHandler,
    postgresClient?: PostgresClient,
    kafkaClient?: KafkaClient,
  ) {
    this.postgresClient = postgresClient || new PostgresClient();
    this.kafkaClient = kafkaClient || new KafkaClient();

    const charRepo = new PostgresCharacterRepository(this.postgresClient);
    const universeRepo = new PostgresUniverseRepository(this.postgresClient);
    const publisher = new KafkaEventPublisher(this.kafkaClient);

    this.createHandler =
      createHandler || new CreateCharacterCommandHandler(charRepo, universeRepo, publisher);
    this.getHandler = getHandler || new GetCharacterQueryHandler(charRepo);
    this.listHandler = listHandler || new ListCharactersByUniverseQueryHandler(charRepo);
  }

  // POST /universes/:universeId/characters
  public createCharacter = async (req: Request, res: Response): Promise<void> => {
    try {
      const { universeId } = req.params;
      const { primaryName, createdBy, characterId } = req.body;

      if (!universeId || !primaryName || !createdBy) {
        res.status(400).json({
          error: "BAD_REQUEST",
          message: "universeId, primaryName, and createdBy are required fields",
        });
        return;
      }

      const result = await this.createHandler.execute({
        characterId,
        universeId,
        primaryName,
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

  // GET /characters/:id
  public getCharacterById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          error: "BAD_REQUEST",
          message: "Character ID parameter is required",
        });
        return;
      }

      const result = await this.getHandler.execute({ characterId: id });

      if (!result) {
        res.status(404).json({
          error: "NOT_FOUND",
          message: `Character with ID '${id}' not found`,
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

  // GET /universes/:universeId/characters
  public listCharactersByUniverse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { universeId } = req.params;
      if (!universeId) {
        res.status(400).json({
          error: "BAD_REQUEST",
          message: "Universe ID parameter is required",
        });
        return;
      }

      const result = await this.listHandler.execute({ universeId });
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
