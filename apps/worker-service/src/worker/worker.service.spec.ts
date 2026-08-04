import type { EachMessagePayload } from "kafkajs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkerService } from "./worker.service.js";

const runMock = vi.fn();
const connectMock = vi.fn().mockResolvedValue(undefined);
const subscribeMock = vi.fn().mockResolvedValue(undefined);
const disconnectMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@storyos/infrastructure-kafka", () => ({
  KafkaClient: vi.fn().mockImplementation(() => ({
    getKafka: vi.fn().mockReturnValue({
      consumer: vi.fn().mockReturnValue({
        connect: connectMock,
        subscribe: subscribeMock,
        run: runMock,
        disconnect: disconnectMock,
      }),
    }),
  })),
}));

describe("StoryOS Worker Service (Kafka Consumer)", () => {
  let workerService: WorkerService;

  beforeEach(() => {
    runMock.mockClear();
    connectMock.mockClear();
    subscribeMock.mockClear();
    disconnectMock.mockClear();
    workerService = new WorkerService();
  });

  afterEach(async () => {
    await workerService.close();
  });

  it("start() connects, subscribes to the default topic, and begins consuming", async () => {
    await workerService.start();

    expect(connectMock).toHaveBeenCalledOnce();
    expect(subscribeMock).toHaveBeenCalledWith({
      topic: "storyos.entity.events",
      fromBeginning: true,
    });
    expect(runMock).toHaveBeenCalledOnce();
    expect(runMock).toHaveBeenCalledWith(
      expect.objectContaining({ eachMessage: expect.any(Function) }),
    );
  });

  it("handleMessage() logs the consumed payload", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const payload: EachMessagePayload = {
      topic: "storyos.entity.events",
      partition: 0,
      message: {
        key: Buffer.from("char_1"),
        value: Buffer.from('{"characterId":"char_1"}'),
        timestamp: "1720000000000",
        attributes: 0,
        offset: "42",
        headers: {},
      },
      heartbeat: vi.fn(),
      pause: () => () => undefined,
    };

    await workerService.handleMessage(payload);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("topic=storyos.entity.events"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('{"characterId":"char_1"}'));
    logSpy.mockRestore();
  });

  it("close() disconnects the consumer", async () => {
    await workerService.start();
    await workerService.close();

    expect(disconnectMock).toHaveBeenCalledOnce();
  });
});
