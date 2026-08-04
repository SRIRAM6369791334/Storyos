import { KafkaClient } from "@storyos/infrastructure-kafka";
import type { Consumer, EachMessagePayload } from "kafkajs";

export interface WorkerServiceOptions {
  topic?: string;
  groupId?: string;
}

export class WorkerService {
  private readonly kafkaClient: KafkaClient;
  private readonly topic: string;
  private readonly groupId: string;
  private consumer: Consumer | undefined;

  constructor(kafkaClient?: KafkaClient, options?: WorkerServiceOptions) {
    this.kafkaClient = kafkaClient ?? new KafkaClient();
    this.topic = options?.topic || process.env.KAFKA_TOPIC || "storyos.entity.events";
    this.groupId = options?.groupId || process.env.KAFKA_GROUP_ID || "storyos-worker-service";
  }

  public async start(): Promise<void> {
    const consumer = this.kafkaClient.getKafka().consumer({ groupId: this.groupId });
    await consumer.connect();
    await consumer.subscribe({ topic: this.topic, fromBeginning: true });
    await consumer.run({
      eachMessage: (payload) => this.handleMessage(payload),
    });
    this.consumer = consumer;
  }

  public async handleMessage({ topic, partition, message }: EachMessagePayload): Promise<void> {
    const value = message.value ? message.value.toString() : "null";
    console.log(
      `[StoryOS Worker Service] Received message - topic=${topic} partition=${partition} offset=${message.offset}`,
    );
    console.log(`[StoryOS Worker Service] Payload: ${value}`);
  }

  public async close(): Promise<void> {
    if (this.consumer) {
      await this.consumer.disconnect();
      this.consumer = undefined;
    }
  }
}
