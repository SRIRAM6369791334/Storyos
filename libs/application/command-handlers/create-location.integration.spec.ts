import fs from "node:fs";
import path from "node:path";
import { DomainValidationError } from "@storyos/domain-world-building";
import { KafkaClient, KafkaEventPublisher } from "@storyos/infrastructure-kafka";
import {
  PostgresClient,
  PostgresLocationRepository,
  PostgresUniverseRepository,
} from "@storyos/infrastructure-postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GetLocationQueryHandler } from "../query-handlers/get-location.handler.js";
import { ListChildLocationsQueryHandler } from "../query-handlers/list-child-locations.handler.js";
import { ListLocationsByUniverseQueryHandler } from "../query-handlers/list-locations-by-universe.handler.js";
import { CreateLocationCommandHandler } from "./create-location.handler.js";
import { CreateUniverseCommandHandler } from "./create-universe.handler.js";

describe("Sprint 3 Integration: Location Slice with Real Infra (Postgres & Kafka)", () => {
  let postgresClient: PostgresClient;
  let kafkaClient: KafkaClient;
  let universeRepo: PostgresUniverseRepository;
  let locationRepo: PostgresLocationRepository;
  let eventPublisher: KafkaEventPublisher;
  let createUniverseHandler: CreateUniverseCommandHandler;
  let createLocationHandler: CreateLocationCommandHandler;
  let getLocationHandler: GetLocationQueryHandler;
  let listLocationsHandler: ListLocationsByUniverseQueryHandler;
  let listChildLocationsHandler: ListChildLocationsQueryHandler;

  beforeAll(async () => {
    postgresClient = new PostgresClient();
    kafkaClient = new KafkaClient();

    const pgHealth = await postgresClient.checkHealth();
    expect(pgHealth.status).toBe("healthy");

    const kafkaHealth = await kafkaClient.checkHealth();
    expect(kafkaHealth.status).toBe("healthy");

    universeRepo = new PostgresUniverseRepository(postgresClient);
    locationRepo = new PostgresLocationRepository(postgresClient);
    eventPublisher = new KafkaEventPublisher(kafkaClient);

    const pool = postgresClient.getPool();

    const universeSqlPath = path.join(
      process.cwd(),
      "libs/infrastructure/database-postgres/src/migrations/001_create_universes_table.sql",
    );
    await pool.query(fs.readFileSync(universeSqlPath, "utf-8"));

    const locationSqlPath = path.join(
      process.cwd(),
      "libs/infrastructure/database-postgres/src/migrations/003_create_locations_table.sql",
    );
    await pool.query(fs.readFileSync(locationSqlPath, "utf-8"));

    createUniverseHandler = new CreateUniverseCommandHandler(universeRepo, eventPublisher);
    createLocationHandler = new CreateLocationCommandHandler(
      locationRepo,
      universeRepo,
      eventPublisher,
    );
    getLocationHandler = new GetLocationQueryHandler(locationRepo);
    listLocationsHandler = new ListLocationsByUniverseQueryHandler(locationRepo);
    listChildLocationsHandler = new ListChildLocationsQueryHandler(locationRepo);
  }, 30000);

  afterAll(async () => {
    if (postgresClient) await postgresClient.close();
    if (kafkaClient) await kafkaClient.close();
  });

  it("rejects location creation when target universeId does not exist", async () => {
    const command = {
      locationId: `loc_nonexistent_${Date.now()}`,
      universeId: "uni_does_not_exist_9999",
      name: "Orphan Location",
      createdBy: "usr_integration",
    };

    await expect(createLocationHandler.execute(command)).rejects.toThrow(DomainValidationError);
  });

  it("rejects child location creation when parentLocationId does not exist", async () => {
    const universeId = `uni_loc_test_1_${Date.now()}`;
    await createUniverseHandler.execute({
      universeId,
      organizationId: "org_loc_test",
      title: "Test Universe 1",
      createdBy: "usr_integration",
    });

    const command = {
      locationId: `loc_child_${Date.now()}`,
      universeId,
      parentLocationId: "loc_missing_parent_999",
      name: "Orphan Child Location",
      createdBy: "usr_integration",
    };

    const err = await createLocationHandler.execute(command).catch((e) => e);
    expect(err).toBeInstanceOf(DomainValidationError);
    expect(err.rule).toBe("NOT_FOUND");
    expect(err.field).toBe("parentLocationId");
  });

  it("rejects child location creation when parentLocationId belongs to a different universe", async () => {
    const universeId1 = `uni_loc_u1_${Date.now()}`;
    const universeId2 = `uni_loc_u2_${Date.now()}`;

    await createUniverseHandler.execute({
      universeId: universeId1,
      organizationId: "org_loc_test",
      title: "Universe One",
      createdBy: "usr_integration",
    });

    await createUniverseHandler.execute({
      universeId: universeId2,
      organizationId: "org_loc_test",
      title: "Universe Two",
      createdBy: "usr_integration",
    });

    const parentInU1 = await createLocationHandler.execute({
      locationId: `loc_parent_u1_${Date.now()}`,
      universeId: universeId1,
      name: "Kingdom of U1",
      createdBy: "usr_integration",
    });

    const crossUnivChildCommand = {
      locationId: `loc_child_u2_${Date.now()}`,
      universeId: universeId2,
      parentLocationId: parentInU1.locationId,
      name: "Illegal Cross Universe Castle",
      createdBy: "usr_integration",
    };

    const err = await createLocationHandler.execute(crossUnivChildCommand).catch((e) => e);
    expect(err).toBeInstanceOf(DomainValidationError);
    expect(err.rule).toBe("CROSS_UNIVERSE_PROHIBITED");
    expect(err.field).toBe("parentLocationId");
  });

  it("creates parent & child locations, verifies Postgres rows, Kafka events, and Child Location Queries", async () => {
    const universeId = `uni_loc_hierarchy_${Date.now()}`;
    const parentLocId = `loc_region_${Date.now()}`;
    const childLocId = `loc_city_${Date.now()}`;

    // 1. Create parent Universe
    await createUniverseHandler.execute({
      universeId,
      organizationId: "org_loc_test",
      title: "Arthurian Geography Universe",
      createdBy: "usr_integration",
    });

    // 2. Setup Kafka Consumer for location-events
    const kafka = kafkaClient.getKafka();
    const producer = kafka.producer();
    await producer.connect();

    const admin = kafka.admin();
    await admin.connect();
    try {
      await admin.createTopics({
        topics: [{ topic: "location-events", numPartitions: 1 }],
      });
    } catch {
      // Topic might already exist
    } finally {
      await admin.disconnect();
    }

    const consumer = kafka.consumer({ groupId: `test-loc-group-${Date.now()}` });
    await consumer.connect();
    await consumer.subscribe({ topic: "location-events", fromBeginning: true });

    const receivedEvents: any[] = [];
    await consumer.run({
      eachMessage: async ({ message }) => {
        if (message.value) {
          receivedEvents.push(JSON.parse(message.value.toString()));
        }
      },
    });

    await new Promise((r) => setTimeout(r, 1500));

    // 3. Create Parent Location (Region)
    const parentLoc = await createLocationHandler.execute({
      locationId: parentLocId,
      universeId,
      name: "Logres",
      locationType: "REGION",
      createdBy: "usr_integration",
    });

    // 4. Create Child Location (City inside Region)
    const childLoc = await createLocationHandler.execute({
      locationId: childLocId,
      universeId,
      parentLocationId: parentLocId,
      name: "Camelot",
      locationType: "CITY",
      createdBy: "usr_integration",
    });

    expect(parentLoc.locationId).toBe(parentLocId);
    expect(childLoc.locationId).toBe(childLocId);
    expect(childLoc.parentLocationId).toBe(parentLocId);

    // 5. Verify direct Postgres rows
    const pool = postgresClient.getPool();
    const dbChildRow = await pool.query("SELECT * FROM locations WHERE id = $1", [childLocId]);
    expect(dbChildRow.rows.length).toBe(1);
    expect(dbChildRow.rows[0].parent_location_id).toBe(parentLocId);
    expect(dbChildRow.rows[0].name).toBe("Camelot");

    // 6. Query via GetLocationQueryHandler & ListLocationsByUniverseQueryHandler
    const getResult = await getLocationHandler.execute({ locationId: childLocId });
    expect(getResult).not.toBeNull();
    expect(getResult?.name).toBe("Camelot");

    const allLocations = await listLocationsHandler.execute({ universeId });
    expect(allLocations.length).toBe(2);

    // 7. Query direct children via ListChildLocationsQueryHandler
    const children = await listChildLocationsHandler.execute({ parentId: parentLocId });
    expect(children.length).toBe(1);
    expect(children[0]?.locationId).toBe(childLocId);
    expect(children[0]?.name).toBe("Camelot");

    // 7. Verify Kafka events received
    let attempts = 0;
    while (receivedEvents.length < 2 && attempts < 10) {
      await new Promise((r) => setTimeout(r, 500));
      attempts++;
    }

    const parentEvent = receivedEvents.find((e) => e.locationId === parentLocId);
    const childEvent = receivedEvents.find((e) => e.locationId === childLocId);

    expect(parentEvent).toBeDefined();
    expect(childEvent).toBeDefined();
    expect(childEvent?.parentLocationId).toBe(parentLocId);

    await producer.disconnect();
    await consumer.disconnect();
  }, 40000);
});
