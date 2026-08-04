import { CreateUniverseCommandHandler, GetUniverseQueryHandler } from "@storyos/application";
import { DomainValidationError } from "@storyos/domain-universe";
import { KafkaClient, KafkaEventPublisher } from "@storyos/infrastructure-kafka";
import { PostgresClient, PostgresUniverseRepository } from "@storyos/infrastructure-postgres";
import type { Request, Response } from "express";

export class UniverseController {
  private createHandler: CreateUniverseCommandHandler;
  private getHandler: GetUniverseQueryHandler;
  private postgresClient: PostgresClient;
  private kafkaClient: KafkaClient;

  constructor(
    createHandler?: CreateUniverseCommandHandler,
    getHandler?: GetUniverseQueryHandler,
    postgresClient?: PostgresClient,
    kafkaClient?: KafkaClient,
  ) {
    this.postgresClient = postgresClient || new PostgresClient();
    this.kafkaClient = kafkaClient || new KafkaClient();

    const repo = new PostgresUniverseRepository(this.postgresClient);
    const publisher = new KafkaEventPublisher(this.kafkaClient);

    this.createHandler = createHandler || new CreateUniverseCommandHandler(repo, publisher);
    this.getHandler = getHandler || new GetUniverseQueryHandler(repo);
  }

  // POST /universes
  public createUniverse = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        organizationId,
        title,
        createdBy,
        universeId,
        synopsis,
        genre,
        primaryMedium,
        targetAudience,
        maturityRating,
      } = req.body;

      if (!organizationId || !title || !createdBy) {
        res.status(400).json({
          error: "BAD_REQUEST",
          message: "organizationId, title, and createdBy are required fields",
        });
        return;
      }

      const result = await this.createHandler.execute({
        universeId,
        organizationId,
        title,
        createdBy,
        synopsis,
        genre,
        primaryMedium,
        targetAudience,
        maturityRating,
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

  // GET /universes/:id
  public getUniverseById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          error: "BAD_REQUEST",
          message: "Universe ID parameter is required",
        });
        return;
      }

      const result = await this.getHandler.execute({ universeId: id });

      if (!result) {
        res.status(404).json({
          error: "NOT_FOUND",
          message: `Universe with ID '${id}' not found`,
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

  public close = async (): Promise<void> => {
    await Promise.allSettled([this.postgresClient.close(), this.kafkaClient.close()]);
  };
}
