import fs from "node:fs";
import path from "node:path";
import { DomainValidationError } from "@storyos/domain-character";
import { KafkaClient, KafkaEventPublisher } from "@storyos/infrastructure-kafka";
import {
  PostgresCharacterRepository,
  PostgresClient,
  PostgresUniverseRepository,
} from "@storyos/infrastructure-postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GetCharacterQueryHandler } from "../query-handlers/get-character.handler.js";
import { ListCharactersByUniverseQueryHandler } from "../query-handlers/list-characters-by-universe.handler.js";
import { CreateCharacterCommandHandler } from "./create-character.handler.js";
import { CreateUniverseCommandHandler } from "./create-universe.handler.js";

describe("Sprint 2 Integration: Character Slice with Real Infra (Postgres & Kafka)", () => {
  let postgresClient: PostgresClient;
  let kafkaClient: KafkaClient;
  let universeRepo: PostgresUniverseRepository;
  let characterRepo: PostgresCharacterRepository;
  let eventPublisher: KafkaEventPublisher;
  let createUniverseHandler: CreateUniverseCommandHandler;
  let createCharacterHandler: CreateCharacterCommandHandler;
  let getCharacterHandler: GetCharacterQueryHandler;
  let listCharactersHandler: ListCharactersByUniverseQueryHandler;

  beforeAll(async () => {
    postgresClient = new PostgresClient();
    kafkaClient = new KafkaClient();

    // Verify container connections
    const pgHealth = await postgresClient.checkHealth();
    expect(pgHealth.status).toBe("healthy");

    const kafkaHealth = await kafkaClient.checkHealth();
    expect(kafkaHealth.status).toBe("healthy");

    universeRepo = new PostgresUniverseRepository(postgresClient);
    characterRepo = new PostgresCharacterRepository(postgresClient);
    eventPublisher = new KafkaEventPublisher(kafkaClient);

    // Apply SQL DDL migrations
    const pool = postgresClient.getPool();

    const universeSqlPath = path.join(
      process.cwd(),
      "libs/infrastructure/database-postgres/src/migrations/001_create_universes_table.sql",
    );
    const universeSql = fs.readFileSync(universeSqlPath, "utf-8");
    await pool.query(universeSql);

    const characterSqlPath = path.join(
      process.cwd(),
      "libs/infrastructure/database-postgres/src/migrations/002_create_characters_table.sql",
    );
    const characterSql = fs.readFileSync(characterSqlPath, "utf-8");
    await pool.query(characterSql);

    createUniverseHandler = new CreateUniverseCommandHandler(universeRepo, eventPublisher);
    createCharacterHandler = new CreateCharacterCommandHandler(
      characterRepo,
      universeRepo,
      eventPublisher,
    );
    getCharacterHandler = new GetCharacterQueryHandler(characterRepo);
    listCharactersHandler = new ListCharactersByUniverseQueryHandler(characterRepo);
  }, 30000);

  afterAll(async () => {
    if (postgresClient) await postgresClient.close();
    if (kafkaClient) await kafkaClient.close();
  });

  it("fails validation and rejects character creation when target universeId does not exist", async () => {
    const command = {
      characterId: `char_nonexistent_${Date.now()}`,
      universeId: "uni_does_not_exist_9999",
      primaryName: "Orphan Character",
      createdBy: "usr_integration",
    };

    await expect(createCharacterHandler.execute(command)).rejects.toThrow(DomainValidationError);

    // Verify DB does not contain the character
    const dbCheck = await characterRepo.findById(command.characterId as any);
    expect(dbCheck).toBeNull();
  });

  it("creates Universe, creates Character for Universe, verifies Postgres FK row, Kafka event, and CQRS Query Handlers", async () => {
    const universeId = `uni_char_integration_${Date.now()}`;
    const characterId = `char_integration_${Date.now()}`;

    // 1. Create parent Universe
    await createUniverseHandler.execute({
      universeId,
      organizationId: "org_char_test",
      title: "Arthurian Legend Universe",
      createdBy: "usr_integration",
    });

    // 2. Setup Kafka Consumer to listen for CharacterCreated event
    const kafka = kafkaClient.getKafka();
    const producer = kafka.producer();
    await producer.connect();

    const admin = kafka.admin();
    await admin.connect();
    try {
      await admin.createTopics({
        topics: [{ topic: "character-events", numPartitions: 1 }],
      });
    } catch {
      // Topic might already exist
    } finally {
      await admin.disconnect();
    }

    const consumer = kafka.consumer({ groupId: `test-char-group-${Date.now()}` });
    await consumer.connect();
    await consumer.subscribe({ topic: "character-events", fromBeginning: true });

    const receivedEvents: any[] = [];
    await consumer.run({
      eachMessage: async ({ message }) => {
        if (message.value) {
          receivedEvents.push(JSON.parse(message.value.toString()));
        }
      },
    });

    // Short wait for consumer group join
    await new Promise((r) => setTimeout(r, 1500));

    // 3. Create Character for the created Universe
    const charResult = await createCharacterHandler.execute({
      characterId,
      universeId,
      primaryName: "King Arthur Pendragon",
      createdBy: "usr_integration",
    });

    expect(charResult.characterId).toBe(characterId);
    expect(charResult.universeId).toBe(universeId);
    expect(charResult.primaryName).toBe("King Arthur Pendragon");
    expect(charResult.status).toBe("DRAFT");
    expect(charResult.canonStatus).toBe("DRAFT");

    // 4. Verify PostgreSQL row direct DB query (testing foreign key integrity & column state)
    const pool = postgresClient.getPool();
    const dbRowRes = await pool.query("SELECT * FROM characters WHERE id = $1", [characterId]);
    expect(dbRowRes.rows.length).toBe(1);
    expect(dbRowRes.rows[0].universe_id).toBe(universeId);
    expect(dbRowRes.rows[0].primary_name).toBe("King Arthur Pendragon");

    // 5. Query via GetCharacterQueryHandler
    const getResult = await getCharacterHandler.execute({ characterId });
    expect(getResult).not.toBeNull();
    expect(getResult?.characterId).toBe(characterId);
    expect(getResult?.primaryName).toBe("King Arthur Pendragon");

    // 6. Query via ListCharactersByUniverseQueryHandler
    const listResult = await listCharactersHandler.execute({ universeId });
    expect(listResult.length).toBeGreaterThanOrEqual(1);
    expect(listResult.some((c) => c.characterId === characterId)).toBe(true);

    // 7. Verify Kafka event arrived
    let attempts = 0;
    while (receivedEvents.length === 0 && attempts < 10) {
      await new Promise((r) => setTimeout(r, 500));
      attempts++;
    }

    const matchingEvent = receivedEvents.find(
      (e) => e.eventType === "CharacterCreated" && e.characterId === characterId,
    );

    expect(matchingEvent).toBeDefined();
    expect(matchingEvent?.universeId).toBe(universeId);
    expect(matchingEvent?.primaryName).toBe("King Arthur Pendragon");

    await producer.disconnect();
    await consumer.disconnect();
  }, 35000);
});
