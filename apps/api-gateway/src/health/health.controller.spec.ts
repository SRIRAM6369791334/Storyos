import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HealthController } from "./health.controller.js";

// Mock infrastructure health checks for unit testing
vi.mock("@storyos/infrastructure-postgres", () => ({
  PostgresClient: vi.fn().mockImplementation(() => ({
    checkHealth: vi.fn().mockResolvedValue({ status: "healthy", latencyMs: 5 }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  PostgresUniverseRepository: vi.fn().mockImplementation(() => ({
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
  })),
  PostgresCharacterRepository: vi.fn().mockImplementation(() => ({
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findByUniverseId: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
  })),
  PostgresLocationRepository: vi.fn().mockImplementation(() => ({
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findByUniverseId: vi.fn().mockResolvedValue([]),
    findByParentId: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("@storyos/infrastructure-neo4j", () => ({
  Neo4jClient: vi.fn().mockImplementation(() => ({
    checkHealth: vi.fn().mockResolvedValue({ status: "healthy", latencyMs: 8 }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  Neo4jRelationshipRepository: vi.fn().mockImplementation(() => ({
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findByCharacterId: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("@storyos/infrastructure-redis", () => ({
  RedisClient: vi.fn().mockImplementation(() => ({
    checkHealth: vi.fn().mockResolvedValue({ status: "healthy", latencyMs: 2 }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("@storyos/infrastructure-milvus", () => ({
  StoryOSMilvusClient: vi.fn().mockImplementation(() => ({
    checkHealth: vi.fn().mockResolvedValue({ status: "healthy", latencyMs: 12 }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("@storyos/infrastructure-kafka", () => ({
  KafkaClient: vi.fn().mockImplementation(() => ({
    checkHealth: vi.fn().mockResolvedValue({ status: "healthy", latencyMs: 15 }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  KafkaEventPublisher: vi.fn().mockImplementation(() => ({
    publish: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe("API Gateway Health Checks (REL-001)", () => {
  let _app: any;
  let healthController: any;

  beforeEach(() => {
    healthController = new HealthController();
  });

  afterEach(async () => {
    await healthController.close();
  });

  it("GET /health returns 200 UP for shallow liveness probe", async () => {
    const req = {} as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    healthController.getLiveness(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "UP",
        service: "StoryOS API Gateway",
      }),
    );
  });

  it("GET /health/deep returns 200 UP when all 5 infrastructure components are healthy", async () => {
    const req = {} as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    await healthController.getReadiness(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "UP",
        components: expect.objectContaining({
          postgres: expect.objectContaining({ status: "healthy" }),
          neo4j: expect.objectContaining({ status: "healthy" }),
          redis: expect.objectContaining({ status: "healthy" }),
          milvus: expect.objectContaining({ status: "healthy" }),
          kafka: expect.objectContaining({ status: "healthy" }),
        }),
      }),
    );
  });
});
