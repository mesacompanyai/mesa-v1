import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import {
  DEFAULT_JOB_OPTIONS,
  EvolutionWebhookJob,
  MediaProcessingJob,
  QUEUE_NAMES,
  QueueName,
} from "../../../../packages/shared/src";

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly connection: IORedis;
  private readonly queues = new Map<QueueName, Queue>();

  constructor(private readonly config: ConfigService) {
    const redisUrl = this.config.getOrThrow<string>("REDIS_URL");
    this.connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }

  getQueue(name: QueueName): Queue {
    const existing = this.queues.get(name);
    if (existing) return existing;

    const queue = new Queue(name, {
      connection: this.connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });

    this.queues.set(name, queue);
    return queue;
  }

  async enqueueEvolutionEvent(job: EvolutionWebhookJob): Promise<string | undefined> {
    const queued = await this.getQueue(QUEUE_NAMES.evolutionEvents).add("process-evolution-event", job, {
      jobId: job.idempotencyKey,
    });
    return queued.id;
  }

  async enqueueMedia(job: MediaProcessingJob): Promise<string | undefined> {
    const queued = await this.getQueue(QUEUE_NAMES.mediaProcessing).add("process-media", job, {
      jobId: job.mediaAssetId,
    });
    return queued.id;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
    await this.connection.quit();
  }
}
