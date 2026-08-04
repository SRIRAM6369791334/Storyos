import {
  CreateRelationshipCommandHandler,
  GetRelationshipQueryHandler,
  ListRelationshipsByCharacterQueryHandler,
} from "@storyos/application";
import { DomainValidationError } from "@storyos/domain-relationship";
import { KafkaClient, KafkaEventPublisher } from "@storyos/infrastructure-kafka";
import { Neo4jClient, Neo4jRelationshipRepository } from "@storyos/infrastructure-neo4j";
import { PostgresCharacterRepository, PostgresClient } from "@storyos/infrastructure-postgres";
import type { Request, Response } from "express";

export class RelationshipController {
  private createHandler: CreateRelationshipCommandHandler;
  private getHandler: GetRelationshipQueryHandler;
  private listByCharacterHandler: ListRelationshipsByCharacterQueryHandler;
  private postgresClient: PostgresClient;
  private neo4jClient: Neo4jClient;
  private kafkaClient: KafkaClient;

  constructor(
    createHandler?: CreateRelationshipCommandHandler,
    getHandler?: GetRelationshipQueryHandler,
    listByCharacterHandler?: ListRelationshipsByCharacterQueryHandler,
    postgresClient?: PostgresClient,
    neo4jClient?: Neo4jClient,
    kafkaClient?: KafkaClient,
  ) {
    this.postgresClient = postgresClient || new PostgresClient();
    this.neo4jClient = neo4jClient || new Neo4jClient();
    this.kafkaClient = kafkaClient || new KafkaClient();

    const relRepo = new Neo4jRelationshipRepository(this.neo4jClient);
    const charRepo = new PostgresCharacterRepository(this.postgresClient);
    const publisher = new KafkaEventPublisher(this.kafkaClient);

    this.createHandler =
      createHandler || new CreateRelationshipCommandHandler(relRepo, charRepo, publisher);
    this.getHandler = getHandler || new GetRelationshipQueryHandler(relRepo);
    this.listByCharacterHandler =
      listByCharacterHandler || new ListRelationshipsByCharacterQueryHandler(relRepo);
  }

  // POST /universes/:universeId/relationships
  public createRelationship = async (req: Request, res: Response): Promise<void> => {
    try {
      const { universeId } = req.params;
      const {
        sourceCharacterId,
        targetCharacterId,
        relationshipType,
        direction,
        createdBy,
        relationshipId,
      } = req.body;

      if (
        !universeId ||
        !sourceCharacterId ||
        !targetCharacterId ||
        !relationshipType ||
        !createdBy
      ) {
        res.status(400).json({
          error: "BAD_REQUEST",
          message:
            "universeId, sourceCharacterId, targetCharacterId, relationshipType, and createdBy are required fields",
        });
        return;
      }

      const result = await this.createHandler.execute({
        relationshipId,
        universeId,
        sourceCharacterId,
        targetCharacterId,
        relationshipType,
        direction,
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

  // GET /relationships/:id
  public getRelationshipById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          error: "BAD_REQUEST",
          message: "Relationship ID parameter is required",
        });
        return;
      }

      const result = await this.getHandler.execute({ relationshipId: id });

      if (!result) {
        res.status(404).json({
          error: "NOT_FOUND",
          message: `Relationship with ID '${id}' not found`,
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

  // GET /characters/:characterId/relationships
  public listRelationshipsByCharacter = async (req: Request, res: Response): Promise<void> => {
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
    await Promise.allSettled([
      this.postgresClient.close(),
      this.neo4jClient.close(),
      this.kafkaClient.close(),
    ]);
  };
}
