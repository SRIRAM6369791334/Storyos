import fs from "node:fs";
import path from "node:path";
import { DomainValidationError } from "@storyos/domain-timeline";
import { KafkaClient, KafkaEventPublisher } from "@storyos/infrastructure-kafka";
import {
  PostgresCharacterRepository,
  PostgresClient,
  PostgresEventRepository,
  PostgresLocationRepository,
  PostgresUniverseRepository,
} from "@storyos/infrastructure-postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GetEventQueryHandler } from "../query-handlers/get-event.handler.js";
import { ListEventsByCharacterQueryHandler } from "../query-handlers/list-events-by-character.handler.js";
import { ListEventsByUniverseQueryHandler } from "../query-handlers/list-events-by-universe.handler.js";
import { CreateCharacterCommandHandler } from "./create-character.handler.js";
import { CreateEventCommandHandler } from "./create-event.handler.js";
import { CreateLocationCommandHandler } from "./create-location.handler.js";
import { CreateUniverseCommandHandler } from "./create-universe.handler.js";

describe("Sprint 5 Integration: Timeline Event Slice with Real Infra (Postgres & Kafka)", () => {
  let postgresClient: PostgresClient;
  let kafkaClient: KafkaClient;

  let universeRepo: PostgresUniverseRepository;
  let characterRepo: PostgresCharacterRepository;
  let locationRepo: PostgresLocationRepository;
  let eventRepo: PostgresEventRepository;
  let eventPublisher: KafkaEventPublisher;

  let createUniverseHandler: CreateUniverseCommandHandler;
  let createCharacterHandler: CreateCharacterCommandHandler;
  let createLocationHandler: CreateLocationCommandHandler;
  let createEventHandler: CreateEventCommandHandler;
  let getEventHandler: GetEventQueryHandler;
  let listEventsByUniverseHandler: ListEventsByUniverseQueryHandler;
  let listEventsByCharacterHandler: ListEventsByCharacterQueryHandler;

  beforeAll(async () => {
    postgresClient = new PostgresClient();
    kafkaClient = new KafkaClient();

    const pgHealth = await postgresClient.checkHealth();
    expect(pgHealth.status).toBe("healthy");

    const kafkaHealth = await kafkaClient.checkHealth();
    expect(kafkaHealth.status).toBe("healthy");

    universeRepo = new PostgresUniverseRepository(postgresClient);
    characterRepo = new PostgresCharacterRepository(postgresClient);
    locationRepo = new PostgresLocationRepository(postgresClient);
    eventRepo = new PostgresEventRepository(postgresClient);
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

    const lSqlPath = path.join(
      process.cwd(),
      "libs/infrastructure/database-postgres/src/migrations/003_create_locations_table.sql",
    );
    await pool.query(fs.readFileSync(lSqlPath, "utf-8"));

    const eSqlPath = path.join(
      process.cwd(),
      "libs/infrastructure/database-postgres/src/migrations/004_create_events_table.sql",
    );
    await pool.query(fs.readFileSync(eSqlPath, "utf-8"));

    createUniverseHandler = new CreateUniverseCommandHandler(universeRepo, eventPublisher);
    createCharacterHandler = new CreateCharacterCommandHandler(
      characterRepo,
      universeRepo,
      eventPublisher,
    );
    createLocationHandler = new CreateLocationCommandHandler(
      locationRepo,
      universeRepo,
      eventPublisher,
    );
    createEventHandler = new CreateEventCommandHandler(
      eventRepo,
      universeRepo,
      characterRepo,
      locationRepo,
      eventPublisher,
    );
    getEventHandler = new GetEventQueryHandler(eventRepo);
    listEventsByUniverseHandler = new ListEventsByUniverseQueryHandler(eventRepo);
    listEventsByCharacterHandler = new ListEventsByCharacterQueryHandler(eventRepo);
  }, 30000);

  afterAll(async () => {
    if (postgresClient) await postgresClient.close();
    if (kafkaClient) await kafkaClient.close();
  });

  it("rejects event creation when universeId does not exist", async () => {
    const command = {
      eventId: `evt_orphan_${Date.now()}`,
      universeId: "uni_nonexistent_9999",
      title: "Orphan Event",
      description: "Description",
      createdBy: "usr_integration",
    };

    const err = await createEventHandler.execute(command).catch((e) => e);
    expect(err).toBeInstanceOf(DomainValidationError);
    expect(err.rule).toBe("NOT_FOUND");
    expect(err.field).toBe("universeId");
  });

  it("rejects event creation when locationId does not exist", async () => {
    const universeId = `uni_evt_test_1_${Date.now()}`;
    await createUniverseHandler.execute({
      universeId,
      organizationId: "org_evt_test",
      title: "Test Universe 1",
      createdBy: "usr_integration",
    });

    const command = {
      eventId: `evt_bad_loc_${Date.now()}`,
      universeId,
      title: "Event with Bad Location",
      description: "Description",
      locationId: "loc_nonexistent_9999",
      createdBy: "usr_integration",
    };

    const err = await createEventHandler.execute(command).catch((e) => e);
    expect(err).toBeInstanceOf(DomainValidationError);
    expect(err.rule).toBe("NOT_FOUND");
    expect(err.field).toBe("locationId");
  });

  it("rejects event creation when participant characterId does not exist", async () => {
    const universeId = `uni_evt_test_2_${Date.now()}`;
    await createUniverseHandler.execute({
      universeId,
      organizationId: "org_evt_test",
      title: "Test Universe 2",
      createdBy: "usr_integration",
    });

    const command = {
      eventId: `evt_bad_char_${Date.now()}`,
      universeId,
      title: "Event with Bad Character",
      description: "Description",
      participants: [{ characterId: "char_nonexistent_9999", role: "HERO" }],
      createdBy: "usr_integration",
    };

    const err = await createEventHandler.execute(command).catch((e) => e);
    expect(err).toBeInstanceOf(DomainValidationError);
    expect(err.rule).toBe("NOT_FOUND");
    expect(err.field).toBe("participantCharacterId");
  });

  it("rejects event creation when referenced location or character belongs to a different universe", async () => {
    const u1 = `uni_evt_u1_${Date.now()}`;
    const u2 = `uni_evt_u2_${Date.now()}`;

    await createUniverseHandler.execute({
      universeId: u1,
      organizationId: "org_evt_test",
      title: "Universe 1",
      createdBy: "usr_integration",
    });

    await createUniverseHandler.execute({
      universeId: u2,
      organizationId: "org_evt_test",
      title: "Universe 2",
      createdBy: "usr_integration",
    });

    const charU2 = await createCharacterHandler.execute({
      characterId: `char_u2_${Date.now()}`,
      universeId: u2,
      primaryName: "Mordred U2",
      createdBy: "usr_integration",
    });

    const command = {
      eventId: `evt_cross_univ_${Date.now()}`,
      universeId: u1,
      title: "Illegal Cross Universe Event",
      description: "Description",
      participants: [{ characterId: charU2.characterId }],
      createdBy: "usr_integration",
    };

    const err = await createEventHandler.execute(command).catch((e) => e);
    expect(err).toBeInstanceOf(DomainValidationError);
    expect(err.rule).toBe("CROSS_UNIVERSE_PROHIBITED");
    expect(err.field).toBe("participantCharacterId");
  });

  it("creates valid Event with location and participants, verifies Postgres rows, Kafka events, and Query Handlers", async () => {
    const universeId = `uni_camlann_${Date.now()}`;
    const eventId = `evt_camlann_${Date.now()}`;

    await createUniverseHandler.execute({
      universeId,
      organizationId: "org_evt_test",
      title: "Camelot Universe",
      createdBy: "usr_integration",
    });

    const location = await createLocationHandler.execute({
      locationId: `loc_plain_${Date.now()}`,
      universeId,
      name: "Salisbury Plain",
      createdBy: "usr_integration",
    });

    const arthur = await createCharacterHandler.execute({
      characterId: `char_art_${Date.now()}`,
      universeId,
      primaryName: "King Arthur",
      createdBy: "usr_integration",
    });

    const mordred = await createCharacterHandler.execute({
      characterId: `char_mor_${Date.now()}`,
      universeId,
      primaryName: "Mordred",
      createdBy: "usr_integration",
    });

    // Kafka setup
    const kafka = kafkaClient.getKafka();
    const admin = kafka.admin();
    await admin.connect();
    try {
      await admin.createTopics({
        topics: [{ topic: "timeline-events", numPartitions: 1 }],
      });
    } catch {
      // Topic might already exist
    } finally {
      await admin.disconnect();
    }

    const consumer = kafka.consumer({ groupId: `test-evt-group-${Date.now()}` });
    await consumer.connect();
    await consumer.subscribe({ topic: "timeline-events", fromBeginning: true });

    const receivedEvents: any[] = [];
    await consumer.run({
      eachMessage: async ({ message }) => {
        if (message.value) {
          receivedEvents.push(JSON.parse(message.value.toString()));
        }
      },
    });

    await new Promise((r) => setTimeout(r, 1500));

    // Execute Event Creation
    const createdEvent = await createEventHandler.execute({
      eventId,
      universeId,
      title: "Battle of Camlann",
      description: "The cataclysmic battle ending the Arthurian golden age.",
      locationId: location.locationId,
      status: "CANON",
      participants: [
        { characterId: arthur.characterId, role: "PROTAGONIST" },
        { characterId: mordred.characterId, role: "ANTAGONIST" },
      ],
      createdBy: "usr_integration",
    });

    expect(createdEvent.eventId).toBe(eventId);
    expect(createdEvent.locationId).toBe(location.locationId);
    expect(createdEvent.participants).toHaveLength(2);

    // Verify direct Postgres rows
    const pool = postgresClient.getPool();
    const eventRow = await pool.query("SELECT * FROM events WHERE id = $1", [eventId]);
    expect(eventRow.rows.length).toBe(1);
    expect(eventRow.rows[0].location_id).toBe(location.locationId);

    const partRows = await pool.query(
      "SELECT * FROM event_participants WHERE event_id = $1 ORDER BY role DESC",
      [eventId],
    );
    expect(partRows.rows.length).toBe(2);

    // Query via GetEventQueryHandler
    const getResult = await getEventHandler.execute({ eventId });
    expect(getResult).not.toBeNull();
    expect(getResult?.title).toBe("Battle of Camlann");

    // Query via ListEventsByUniverseQueryHandler
    const univEvents = await listEventsByUniverseHandler.execute({ universeId });
    expect(univEvents.length).toBe(1);

    // Query via ListEventsByCharacterQueryHandler
    const arthurEvents = await listEventsByCharacterHandler.execute({
      characterId: arthur.characterId,
    });
    expect(arthurEvents.length).toBe(1);
    expect(arthurEvents[0]?.eventId).toBe(eventId);

    // Verify Kafka event
    let attempts = 0;
    while (receivedEvents.length < 1 && attempts < 10) {
      await new Promise((r) => setTimeout(r, 500));
      attempts++;
    }

    const kafkaEvt = receivedEvents.find((e) => e.eventId === eventId);
    expect(kafkaEvt).toBeDefined();
    expect(kafkaEvt?.title).toBe("Battle of Camlann");

    await consumer.disconnect();
  }, 40000);
});
