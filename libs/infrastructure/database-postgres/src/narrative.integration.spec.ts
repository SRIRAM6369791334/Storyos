/**
 * Narrative Domain Integration Test
 * Sprint 7 — Work / Chapter / Scene
 *
 * ⚠️  DO NOT RUN THIS FILE — Docker is currently stopped.
 * This test requires: PostgreSQL + Kafka running via `docker compose up -d`.
 * See: docs/engineering/docker_pending_work.md for resume instructions.
 *
 * Command to run when Docker is available:
 *   pnpm test:integration
 */

import {
  CreateChapterCommandHandler,
  CreateSceneCommandHandler,
  CreateWorkCommandHandler,
  GetWorkQueryHandler,
  ListChaptersByWorkQueryHandler,
  ListScenesByChapterQueryHandler,
} from "@storyos/application";
import { KafkaClient, KafkaEventPublisher } from "@storyos/infrastructure-kafka";
import {
  PostgresChapterRepository,
  PostgresClient,
  PostgresSceneRepository,
  PostgresUniverseRepository,
  PostgresWorkRepository,
} from "@storyos/infrastructure-postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe.skip("Narrative Integration Tests (requires Docker)", () => {
  let postgresClient: PostgresClient;
  let kafkaClient: KafkaClient;
  let createWorkHandler: CreateWorkCommandHandler;
  let getWorkHandler: GetWorkQueryHandler;
  let createChapterHandler: CreateChapterCommandHandler;
  let listChaptersByWorkHandler: ListChaptersByWorkQueryHandler;
  let createSceneHandler: CreateSceneCommandHandler;
  let listScenesByChapterHandler: ListScenesByChapterQueryHandler;

  let createdWorkId: string;
  let createdChapterId: string;
  let createdSceneId: string;

  beforeAll(async () => {
    postgresClient = new PostgresClient();
    kafkaClient = new KafkaClient();
    await kafkaClient.connect();

    const workRepo = new PostgresWorkRepository(postgresClient);
    const chapterRepo = new PostgresChapterRepository(postgresClient);
    const sceneRepo = new PostgresSceneRepository(postgresClient);
    const universeRepo = new PostgresUniverseRepository(postgresClient);
    const publisher = new KafkaEventPublisher(kafkaClient);

    createWorkHandler = new CreateWorkCommandHandler(workRepo, universeRepo, publisher);
    getWorkHandler = new GetWorkQueryHandler(workRepo);
    createChapterHandler = new CreateChapterCommandHandler(chapterRepo, workRepo, publisher);
    listChaptersByWorkHandler = new ListChaptersByWorkQueryHandler(chapterRepo);
    createSceneHandler = new CreateSceneCommandHandler(
      sceneRepo,
      chapterRepo,
      undefined,
      undefined,
      publisher,
    );
    listScenesByChapterHandler = new ListScenesByChapterQueryHandler(sceneRepo);
  });

  afterAll(async () => {
    await postgresClient.close();
    await kafkaClient.close();
  });

  // ── Work ───────────────────────────────────────────────────────────────────

  it("creates a Work and persists it to Postgres", async () => {
    // Pre-condition: a Universe must already exist (created by Universe integration test)
    // Adjust universeId to match a seeded Universe in your test DB.
    const universeId = process.env.TEST_UNIVERSE_ID ?? "uni_integration_001";

    const result = await createWorkHandler.execute({
      universeId,
      title: "Integration Test Work",
      createdBy: "usr_integration_001",
    });

    expect(result.workId).toBeTruthy();
    expect(result.title).toBe("Integration Test Work");
    expect(result.draftStatus).toBe("DRAFT");
    createdWorkId = result.workId;
  });

  it("retrieves the created Work by ID", async () => {
    const result = await getWorkHandler.execute({ workId: createdWorkId });
    expect(result).not.toBeNull();
    expect(result?.workId).toBe(createdWorkId);
    expect(result?.title).toBe("Integration Test Work");
  });

  it("returns null for non-existent Work ID", async () => {
    const result = await getWorkHandler.execute({ workId: "work_does_not_exist_xyz" });
    expect(result).toBeNull();
  });

  // ── Chapter ────────────────────────────────────────────────────────────────

  it("creates a Chapter under the Work", async () => {
    const result = await createChapterHandler.execute({
      workId: createdWorkId,
      title: "Integration Chapter 1",
      sequenceNumber: 1,
      createdBy: "usr_integration_001",
    });

    expect(result.chapterId).toBeTruthy();
    expect(result.workId).toBe(createdWorkId);
    expect(result.title).toBe("Integration Chapter 1");
    expect(result.sequenceNumber).toBe(1);
    createdChapterId = result.chapterId;
  });

  it("lists Chapters by Work — returns created chapter", async () => {
    const chapters = await listChaptersByWorkHandler.execute({ workId: createdWorkId });
    expect(chapters.length).toBeGreaterThan(0);
    const found = chapters.find((c) => c.chapterId === createdChapterId);
    expect(found).toBeDefined();
    expect(found?.title).toBe("Integration Chapter 1");
  });

  it("rejects Chapter creation with invalid workId", async () => {
    await expect(
      createChapterHandler.execute({
        workId: "work_does_not_exist_xyz",
        title: "Orphan Chapter",
        createdBy: "usr_001",
      }),
    ).rejects.toThrow();
  });

  // ── Scene ──────────────────────────────────────────────────────────────────

  it("creates a Scene under the Chapter", async () => {
    const result = await createSceneHandler.execute({
      chapterId: createdChapterId,
      title: "Integration Scene 1",
      sequenceNumber: 1,
      createdBy: "usr_integration_001",
    });

    expect(result.sceneId).toBeTruthy();
    expect(result.chapterId).toBe(createdChapterId);
    expect(result.title).toBe("Integration Scene 1");
    expect(result.characterIds).toEqual([]);
    createdSceneId = result.sceneId;
  });

  it("lists Scenes by Chapter — returns created scene", async () => {
    const scenes = await listScenesByChapterHandler.execute({ chapterId: createdChapterId });
    expect(scenes.length).toBeGreaterThan(0);
    const found = scenes.find((s) => s.sceneId === createdSceneId);
    expect(found).toBeDefined();
    expect(found?.title).toBe("Integration Scene 1");
  });

  it("creates a Scene with characterIds", async () => {
    // Pre-condition: characters must be seeded; adjust IDs to match your test fixtures.
    const characterId = process.env.TEST_CHARACTER_ID ?? "char_integration_001";

    const result = await createSceneHandler.execute({
      chapterId: createdChapterId,
      title: "Scene With Characters",
      characterIds: [characterId],
      createdBy: "usr_integration_001",
    });

    expect(result.characterIds).toContain(characterId);
  });

  it("rejects Scene creation with invalid chapterId", async () => {
    await expect(
      createSceneHandler.execute({
        chapterId: "chap_does_not_exist_xyz",
        title: "Orphan Scene",
        createdBy: "usr_001",
      }),
    ).rejects.toThrow();
  });
});
