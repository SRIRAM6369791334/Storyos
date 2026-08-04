import fs from "node:fs";
import path from "node:path";
import { DomainValidationError } from "@storyos/domain-relationship";
import { KafkaClient, KafkaEventPublisher } from "@storyos/infrastructure-kafka";
import { Neo4jClient, Neo4jRelationshipRepository } from "@storyos/infrastructure-neo4j";
import {
  PostgresCharacterRepository,
  PostgresClient,
  PostgresUniverseRepository,
} from "@storyos/infrastructure-postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GetRelationshipQueryHandler } from "../query-handlers/get-relationship.handler.js";
import { ListRelationshipsByCharacterQueryHandler } from "../query-handlers/list-relationships-by-character.handler.js";
import { CreateCharacterCommandHandler } from "./create-character.handler.js";
import { CreateRelationshipCommandHandler } from "./create-relationship.handler.js";
import { CreateUniverseCommandHandler } from "./create-universe.handler.js";

describe("Sprint 4 Integration: Relationship Slice with Real Infra (Postgres, Neo4j & Kafka)", () => {
  let postgresClient: PostgresClient;
  let neo4jClient: Neo4jClient;
  let kafkaClient: KafkaClient;

  let universeRepo: PostgresUniverseRepository;
  let characterRepo: PostgresCharacterRepository;
  let relationshipRepo: Neo4jRelationshipRepository;
  let eventPublisher: KafkaEventPublisher;

  let createUniverseHandler: CreateUniverseCommandHandler;
  let createCharacterHandler: CreateCharacterCommandHandler;
  let createRelationshipHandler: CreateRelationshipCommandHandler;
  let getRelationshipHandler: GetRelationshipQueryHandler;
  let listRelationshipsHandler: ListRelationshipsByCharacterQueryHandler;

  beforeAll(async () => {
    postgresClient = new PostgresClient();
    neo4jClient = new Neo4jClient();
    kafkaClient = new KafkaClient();

    const pgHealth = await postgresClient.checkHealth();
    expect(pgHealth.status).toBe("healthy");

    const neo4jHealth = await neo4jClient.checkHealth();
    expect(neo4jHealth.status).toBe("healthy");

    const kafkaHealth = await kafkaClient.checkHealth();
    expect(kafkaHealth.status).toBe("healthy");

    universeRepo = new PostgresUniverseRepository(postgresClient);
    characterRepo = new PostgresCharacterRepository(postgresClient);
    relationshipRepo = new Neo4jRelationshipRepository(neo4jClient);
    eventPublisher = new KafkaEventPublisher(kafkaClient);

    const pool = postgresClient.getPool();
    const uSqlPath = path.join(
      process.cwd(),
      "libs/infrastructure/database-postgres/src/migrations/001_create_universes_table.sql",
    );
    await pool.query(fs.readFileSync(uSqlPath, "utf-8"));

    const cSqlPath = path.join(
      process.cwd(),
      "libs/infrastructure/database-postgres/src/migrations/002_create_characters_table.sql",
    );
    await pool.query(fs.readFileSync(cSqlPath, "utf-8"));

    createUniverseHandler = new CreateUniverseCommandHandler(universeRepo, eventPublisher);
    createCharacterHandler = new CreateCharacterCommandHandler(
      characterRepo,
      universeRepo,
      eventPublisher,
    );
    createRelationshipHandler = new CreateRelationshipCommandHandler(
      relationshipRepo,
      characterRepo,
      eventPublisher,
    );
    getRelationshipHandler = new GetRelationshipQueryHandler(relationshipRepo);
    listRelationshipsHandler = new ListRelationshipsByCharacterQueryHandler(relationshipRepo);
  }, 30000);

  afterAll(async () => {
    if (postgresClient) await postgresClient.close();
    if (neo4jClient) await neo4jClient.close();
    if (kafkaClient) await kafkaClient.close();
  });

  it("rejects relationship creation when sourceCharacterId does not exist in Postgres", async () => {
    const universeId = `uni_rel_test_1_${Date.now()}`;
    await createUniverseHandler.execute({
      universeId,
      organizationId: "org_rel_test",
      title: "Test Universe 1",
      createdBy: "usr_integration",
    });

    const targetChar = await createCharacterHandler.execute({
      characterId: `char_target_${Date.now()}`,
      universeId,
      primaryName: "Guinevere",
      createdBy: "usr_integration",
    });

    const command = {
      relationshipId: `rel_nonexistent_src_${Date.now()}`,
      universeId,
      sourceCharacterId: "char_does_not_exist_9999",
      targetCharacterId: targetChar.characterId,
      relationshipType: "ALLY",
      createdBy: "usr_integration",
    };

    const err = await createRelationshipHandler.execute(command).catch((e) => e);
    expect(err).toBeInstanceOf(DomainValidationError);
    expect(err.rule).toBe("NOT_FOUND");
    expect(err.field).toBe("sourceCharacterId");
  });

  it("rejects relationship creation when targetCharacterId does not exist in Postgres", async () => {
    const universeId = `uni_rel_test_2_${Date.now()}`;
    await createUniverseHandler.execute({
      universeId,
      organizationId: "org_rel_test",
      title: "Test Universe 2",
      createdBy: "usr_integration",
    });

    const sourceChar = await createCharacterHandler.execute({
      characterId: `char_source_${Date.now()}`,
      universeId,
      primaryName: "King Arthur",
      createdBy: "usr_integration",
    });

    const command = {
      relationshipId: `rel_nonexistent_tgt_${Date.now()}`,
      universeId,
      sourceCharacterId: sourceChar.characterId,
      targetCharacterId: "char_does_not_exist_8888",
      relationshipType: "ALLY",
      createdBy: "usr_integration",
    };

    const err = await createRelationshipHandler.execute(command).catch((e) => e);
    expect(err).toBeInstanceOf(DomainValidationError);
    expect(err.rule).toBe("NOT_FOUND");
    expect(err.field).toBe("targetCharacterId");
  });

  it("rejects relationship creation when two characters belong to different universes", async () => {
    const u1 = `uni_rel_u1_${Date.now()}`;
    const u2 = `uni_rel_u2_${Date.now()}`;

    await createUniverseHandler.execute({
      universeId: u1,
      organizationId: "org_rel_test",
      title: "Universe 1",
      createdBy: "usr_integration",
    });

    await createUniverseHandler.execute({
      universeId: u2,
      organizationId: "org_rel_test",
      title: "Universe 2",
      createdBy: "usr_integration",
    });

    const charU1 = await createCharacterHandler.execute({
      characterId: `char_u1_${Date.now()}`,
      universeId: u1,
      primaryName: "Arthur U1",
      createdBy: "usr_integration",
    });

    const charU2 = await createCharacterHandler.execute({
      characterId: `char_u2_${Date.now()}`,
      universeId: u2,
      primaryName: "Mordred U2",
      createdBy: "usr_integration",
    });

    const command = {
      relationshipId: `rel_cross_univ_${Date.now()}`,
      universeId: u1,
      sourceCharacterId: charU1.characterId,
      targetCharacterId: charU2.characterId,
      relationshipType: "ENEMY",
      createdBy: "usr_integration",
    };

    const err = await createRelationshipHandler.execute(command).catch((e) => e);
    expect(err).toBeInstanceOf(DomainValidationError);
    expect(err.rule).toBe("CROSS_UNIVERSE_PROHIBITED");
    expect(err.field).toBe("targetCharacterId");
  });

  it("creates valid Relationship in Neo4j, publishes Kafka event, and queries back via CQRS handlers", async () => {
    const universeId = `uni_rel_graph_${Date.now()}`;
    const relId = `rel_ally_${Date.now()}`;

    await createUniverseHandler.execute({
      universeId,
      organizationId: "org_rel_test",
      title: "Arthurian Legend",
      createdBy: "usr_integration",
    });

    const arthur = await createCharacterHandler.execute({
      characterId: `char_arthur_${Date.now()}`,
      universeId,
      primaryName: "King Arthur",
      createdBy: "usr_integration",
    });

    const lancelot = await createCharacterHandler.execute({
      characterId: `char_lancelot_${Date.now()}`,
      universeId,
      primaryName: "Sir Lancelot",
      createdBy: "usr_integration",
    });

    // Kafka setup
    const kafka = kafkaClient.getKafka();
    const admin = kafka.admin();
    await admin.connect();
    try {
      await admin.createTopics({
        topics: [{ topic: "relationship-events", numPartitions: 1 }],
      });
    } catch {
      // Topic might already exist
    } finally {
      await admin.disconnect();
    }

    const consumer = kafka.consumer({ groupId: `test-rel-group-${Date.now()}` });
    await consumer.connect();
    await consumer.subscribe({ topic: "relationship-events", fromBeginning: true });

    const receivedEvents: any[] = [];
    await consumer.run({
      eachMessage: async ({ message }) => {
        if (message.value) {
          receivedEvents.push(JSON.parse(message.value.toString()));
        }
      },
    });

    await new Promise((r) => setTimeout(r, 1500));

    // Execute Relationship Creation
    const relResult = await createRelationshipHandler.execute({
      relationshipId: relId,
      universeId,
      sourceCharacterId: arthur.characterId,
      targetCharacterId: lancelot.characterId,
      relationshipType: "ALLY",
      createdBy: "usr_integration",
    });

    expect(relResult.relationshipId).toBe(relId);
    expect(relResult.relationshipType).toBe("ALLY");

    // Verify direct Neo4j Cypher state
    const session = neo4jClient.getDriver().session();
    try {
      const cypherResult = await session.run(
        "MATCH (s:Character {id: $sId})-[r:ALLY {id: $rId}]->(t:Character {id: $tId}) RETURN r",
        { sId: arthur.characterId, rId: relId, tId: lancelot.characterId },
      );
      expect(cypherResult.records.length).toBe(1);
    } finally {
      await session.close();
    }

    // Query via GetRelationshipQueryHandler
    const getResult = await getRelationshipHandler.execute({ relationshipId: relId });
    expect(getResult).not.toBeNull();
    expect(getResult?.relationshipType).toBe("ALLY");

    // Query via ListRelationshipsByCharacterQueryHandler
    const arthurRels = await listRelationshipsHandler.execute({ characterId: arthur.characterId });
    expect(arthurRels.length).toBe(1);
    expect(arthurRels[0]?.relationshipId).toBe(relId);

    const lancelotRels = await listRelationshipsHandler.execute({
      characterId: lancelot.characterId,
    });
    expect(lancelotRels.length).toBe(1);
    expect(lancelotRels[0]?.relationshipId).toBe(relId);

    // Verify Kafka event
    let attempts = 0;
    while (receivedEvents.length < 1 && attempts < 10) {
      await new Promise((r) => setTimeout(r, 500));
      attempts++;
    }

    const relEvent = receivedEvents.find((e) => e.relationshipId === relId);
    expect(relEvent).toBeDefined();
    expect(relEvent?.relationshipType).toBe("ALLY");

    await consumer.disconnect();
  }, 40000);
});
