import { Body, Controller, Headers, Post, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EvolutionWebhookPayload } from "../../../../../packages/shared/src";
import { EvolutionWebhookService } from "./evolution-webhook.service";

@Controller("webhooks/evolution")
export class EvolutionWebhookController {
  constructor(
    private readonly config: ConfigService,
    private readonly service: EvolutionWebhookService,
  ) {}

  @Post()
  async receive(
    @Body() payload: EvolutionWebhookPayload,
    @Headers("authorization") authorization?: string,
    @Headers("x-mesa-webhook-secret") webhookSecret?: string,
  ) {
    const expectedSecret = this.config.get<string>("EVOLUTION_WEBHOOK_SECRET");

    if (expectedSecret) {
      const bearer = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : undefined;
      const providedSecret = bearer || webhookSecret;

      if (providedSecret !== expectedSecret) {
        throw new UnauthorizedException("Invalid Evolution webhook secret");
      }
    }

    return this.service.receiveWebhook(payload);
  }
}
