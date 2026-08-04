import type { CharacterRepository } from "@storyos/domain-character";
import {
  DomainValidationError,
  Relationship,
  type RelationshipCreatedEvent,
  RelationshipDirection,
  type RelationshipRepository,
  RelationshipType,
  createCharacterId,
  createRelationshipId,
  createUniverseId,
  createUserId,
} from "@storyos/domain-relationship";
import type { IEventPublisher } from "@storyos/domain-universe";
import type {
  CreateRelationshipCommand,
  RelationshipDTO,
} from "../use-cases/create-relationship.command.js";

export class CreateRelationshipCommandHandler {
  private relationshipRepo: RelationshipRepository;
  private characterRepo: CharacterRepository;
  private eventPublisher?: IEventPublisher;

  constructor(
    relationshipRepo: RelationshipRepository,
    characterRepo: CharacterRepository,
    eventPublisher?: IEventPublisher,
  ) {
    this.relationshipRepo = relationshipRepo;
    this.characterRepo = characterRepo;
    this.eventPublisher = eventPublisher;
  }

  public async execute(command: CreateRelationshipCommand): Promise<RelationshipDTO> {
    // 1. Strict validation of relationshipType enum BEFORE any Cypher query interpolation
    const validRelTypes = Object.values(RelationshipType) as string[];
    if (!validRelTypes.includes(command.relationshipType)) {
      throw new DomainValidationError(
        "relationshipType",
        "INVALID_ENUM_VALUE",
        `Invalid relationshipType '${command.relationshipType}'. Must be one of: ${validRelTypes.join(", ")}`,
      );
    }

    const relTypeEnum = command.relationshipType as RelationshipType;

    // 2. Validate source character existence in Postgres
    const sourceCharId = createCharacterId(command.sourceCharacterId);
    const sourceCharacter = await this.characterRepo.findById(sourceCharId as any);

    if (!sourceCharacter) {
      throw new DomainValidationError(
        "sourceCharacterId",
        "NOT_FOUND",
        `Source character with ID '${command.sourceCharacterId}' does not exist`,
      );
    }

    // 3. Validate target character existence in Postgres
    const targetCharId = createCharacterId(command.targetCharacterId);
    const targetCharacter = await this.characterRepo.findById(targetCharId as any);

    if (!targetCharacter) {
      throw new DomainValidationError(
        "targetCharacterId",
        "NOT_FOUND",
        `Target character with ID '${command.targetCharacterId}' does not exist`,
      );
    }

    // 4. Validate Universe boundary (both characters must belong to command.universeId)
    if (sourceCharacter.universeId !== command.universeId) {
      throw new DomainValidationError(
        "sourceCharacterId",
        "CROSS_UNIVERSE_PROHIBITED",
        `Source character '${command.sourceCharacterId}' belongs to a different universe`,
      );
    }

    if (targetCharacter.universeId !== command.universeId) {
      throw new DomainValidationError(
        "targetCharacterId",
        "CROSS_UNIVERSE_PROHIBITED",
        `Target character '${command.targetCharacterId}' belongs to a different universe`,
      );
    }

    // 5. Create Relationship aggregate
    const relIdStr =
      command.relationshipId && command.relationshipId.trim().length > 0
        ? command.relationshipId
        : `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const relationshipId = createRelationshipId(relIdStr);
    const universeId = createUniverseId(command.universeId);
    const createdBy = createUserId(command.createdBy);

    let direction = RelationshipDirection.DIRECTED;
    if (command.direction && command.direction === "MUTUAL") {
      direction = RelationshipDirection.MUTUAL;
    }

    const relationship = Relationship.create({
      relationshipId,
      universeId,
      sourceCharacterId: sourceCharId,
      targetCharacterId: targetCharId,
      relationshipType: relTypeEnum,
      direction,
      createdBy,
    });

    // 6. Save edge to Neo4j
    await this.relationshipRepo.save(relationship);

    // 7. Publish domain event to Kafka
    if (this.eventPublisher) {
      const event: RelationshipCreatedEvent = {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        eventType: "RelationshipCreated",
        relationshipId: relationship.relationshipId,
        universeId: relationship.universeId,
        sourceCharacterId: relationship.sourceCharacterId,
        targetCharacterId: relationship.targetCharacterId,
        relationshipType: relationship.relationshipType,
        direction: relationship.direction,
        status: relationship.status,
        canonStatus: relationship.canonStatus,
        createdBy: relationship.createdBy,
        createdAt: relationship.createdAt.toISOString(),
      };
      await this.eventPublisher.publish(
        "relationship-events",
        event as unknown as Record<string, unknown>,
      );
    }

    return {
      relationshipId: relationship.relationshipId,
      universeId: relationship.universeId,
      sourceCharacterId: relationship.sourceCharacterId,
      targetCharacterId: relationship.targetCharacterId,
      relationshipType: relationship.relationshipType,
      direction: relationship.direction,
      status: relationship.status,
      canonStatus: relationship.canonStatus,
      createdBy: relationship.createdBy,
      createdAt: relationship.createdAt.toISOString(),
    };
  }
}
