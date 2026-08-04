import fs from "node:fs";
import path from "node:path";
import { KafkaClient, KafkaEventPublisher } from "@storyos/infrastructure-kafka";
import { PostgresClient, PostgresUniverseRepository } from "@storyos/infrastructure-postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GetUniverseQueryHandler } from "../query-handlers/get-universe.handler.js";
import { CreateUniverseCommandHandler } from "./create-universe.handler.js";

describe("Story Universe End-to-End Integration Verification (Real Postgres & Real Kafka)", () => {
  let postgresClient: PostgresClient;
  let postgresRepo: PostgresUniverseRepository;
  let kafkaClient: KafkaClient;
  let kafkaPublisher: KafkaEventPublisher;
  let createHandler: CreateUniverseCommandHandler;
  let getHandler: GetUniverseQueryHandler;

  beforeAll(async () => {
    // 1. Initialize real Postgres client & repository
    postgresClient = new PostgresClient({
      host: process.env.POSTGRES_HOST || "localhost",
      port: Number(process.env.POSTGRES_PORT || 5432),
      database: process.env.POSTGRES_DB || "storyos_dev",
      user: process.env.POSTGRES_USER || "storyos_admin",
      password: process.env.POSTGRES_PASSWORD || "storyos_dev_password",
    });

    // 2. Run SQL Migration file against local Postgres container
    const migrationPath = path.join(
      process.cwd(),
      "libs/infrastructure/database-postgres/src/migrations/001_create_universes_table.sql",
    );
    const migrationSql = fs.readFileSync(migrationPath, "utf8");
    const pool = postgresClient.getPool();
    await pool.query(migrationSql);

    postgresRepo = new PostgresUniverseRepository(postgresClient);

    // 3. Initialize real Kafka client & ensure topic exists
    kafkaClient = new KafkaClient({
      brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
      clientId: "storyos-integration-test",
    });

    let kafkaReady = false;
    let attempts = 0;
    while (!kafkaReady && attempts < 20) {
      try {
        const admin = kafkaClient.getKafka().admin();
        await admin.connect();
        await admin.createTopics({
          topics: [{ topic: "universe-events", numPartitions: 1, replicationFactor: 1 }],
          waitForLeaders: true,
        });
        await admin.disconnect();
        kafkaReady = true;
      } catch {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (!kafkaReady) {
      throw new Error("Kafka container did not become ready within 20 seconds");
    }

    kafkaPublisher = new KafkaEventPublisher(kafkaClient);

    // 4. Wire real Command & Query Handlers
    createHandler = new CreateUniverseCommandHandler(postgresRepo, kafkaPublisher);
    getHandler = new GetUniverseQueryHandler(postgresRepo);
  }, 45000);

  afterAll(async () => {
    if (postgresClient) {
      await postgresClient.close();
    }
    if (kafkaClient) {
      await kafkaClient.close();
    }
  });

  it("executes CreateUniverseCommandHandler with real Postgres & Kafka, verifies DB row, consumes Kafka event, and queries back via GetUniverseQueryHandler", async () => {
    const testUniverseId = `uni_real_${Date.now()}`;
    const testOrgId = `org_real_${Date.now()}`;
    const testUserId = `usr_real_${Date.now()}`;
    const testTopic = "universe-events";

    // A. Subscribe Kafka Consumer BEFORE publishing event to guarantee capture
    const kafka = kafkaClient.getKafka();
    const consumer = kafka.consumer({ groupId: `test-group-${Date.now()}` });
    await consumer.connect();
    await consumer.subscribe({ topic: testTopic, fromBeginning: false });

    const receivedEvents: any[] = [];
    await consumer.run({
      eachMessage: async ({ message }) => {
        if (message.value) {
          try {
            const parsed = JSON.parse(message.value.toString());
            receivedEvents.push(parsed);
          } catch {
            // Ignore non-JSON
          }
        }
      },
    });

    // Small delay to allow consumer group join & partition assignment to settle
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // B. Execute CreateUniverseCommandHandler with real infrastructure
    const command = {
      universeId: testUniverseId,
      organizationId: testOrgId,
      title: "Real Infrastructure Integration Universe",
      createdBy: testUserId,
      synopsis: "A universe created and verified against real Postgres and real Kafka.",
      genre: ["FANTASY", "SCIENCE_FICTION"],
      primaryMedium: "NOVEL",
    };

    const createdDto = await createHandler.execute(command);

    expect(createdDto.universeId).toBe(testUniverseId);
    expect(createdDto.organizationId).toBe(testOrgId);
    expect(createdDto.title).toBe("Real Infrastructure Integration Universe");

    // C. Verify DB persistence directly in real PostgreSQL
    const pool = postgresClient.getPool();
    const dbResult = await pool.query("SELECT * FROM universes WHERE id = $1", [testUniverseId]);
    expect(dbResult.rows.length).toBe(1);
    expect(dbResult.rows[0].id).toBe(testUniverseId);
    expect(dbResult.rows[0].title).toBe("Real Infrastructure Integration Universe");

    // D. Verify GetUniverseQueryHandler reads the real row back
    const fetchedDto = await getHandler.execute({ universeId: testUniverseId });
    expect(fetchedDto).not.toBeNull();
    expect(fetchedDto?.universeId).toBe(testUniverseId);
    expect(fetchedDto?.organizationId).toBe(testOrgId);
    expect(fetchedDto?.synopsis).toBe(
      "A universe created and verified against real Postgres and real Kafka.",
    );

    // E. Wait for Kafka Consumer to capture UniverseCreated event
    let attempts = 0;
    while (receivedEvents.length === 0 && attempts < 25) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      attempts++;
    }

    await consumer.disconnect();

    const matchingEvent = receivedEvents.find((evt) => evt.universeId === testUniverseId);
    expect(matchingEvent).toBeDefined();
    expect(matchingEvent?.eventType).toBe("UniverseCreated");
    expect(matchingEvent?.organizationId).toBe(testOrgId);
    expect(matchingEvent?.title).toBe("Real Infrastructure Integration Universe");

    // Cleanup test record in Postgres
    await pool.query("DELETE FROM universes WHERE id = $1", [testUniverseId]);
  }, 45000);
});
