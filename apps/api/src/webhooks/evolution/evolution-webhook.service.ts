import { Injectable } from "@nestjs/common";
import { Prisma, EventStatus } from "@prisma/client";
import {
  buildEvolutionIdempotencyKey,
  EvolutionWebhookPayload,
  extractEvolutionInstance,
  extractEvolutionMessageId,
  normalizeEvolutionEventName,
} from "../../../../../packages/shared/src";
import { PrismaService } from "../../prisma/prisma.service";
import { QueueService } from "../../queues/queue.service";

@Injectable()
export class EvolutionWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueueService,
  ) {}

  async receiveWebhook(payload: EvolutionWebhookPayload) {
    const instanceName = extractEvolutionInstance(payload);
    const event = normalizeEvolutionEventName(payload.event);
    const externalMessageId = extractEvolutionMessageId(payload);
    const idempotencyKey = buildEvolutionIdempotencyKey(payload);

    const existing = await this.prisma.messageEvent.findUnique({
      where: { idempotencyKey },
      select: { id: true, status: true },
    });

    if (existing) {
      return {
        accepted: true,
        duplicate: true,
        messageEventId: existing.id,
        status: existing.status,
      };
    }

    const whatsappInstance = await this.prisma.whatsappInstance.findUnique({
      where: { instanceName },
      select: { id: true, tenantId: true },
    });

    const status: EventStatus = whatsappInstance ? "queued" : "ignored";
    const messageEvent = await this.prisma.messageEvent.create({
      data: {
        tenantId: whatsappInstance?.tenantId,
        whatsappInstanceId: whatsappInstance?.id,
        instanceName,
        event,
        externalMessageId,
        idempotencyKey,
        payload: payload as Prisma.InputJsonValue,
        status,
      },
      select: {
        id: true,
        status: true,
        idempotencyKey: true,
      },
    });

    let queueJobId: string | undefined;
    if (whatsappInstance) {
      queueJobId = await this.queues.enqueueEvolutionEvent({
        messageEventId: messageEvent.id,
        idempotencyKey,
      });
    }

    return {
      accepted: true,
      duplicate: false,
      messageEventId: messageEvent.id,
      status: messageEvent.status,
      queueJobId,
    };
  }
}
