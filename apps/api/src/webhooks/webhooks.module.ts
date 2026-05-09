import { Module } from "@nestjs/common";
import { EvolutionWebhookModule } from "./evolution/evolution-webhook.module";

@Module({
  imports: [EvolutionWebhookModule],
})
export class WebhooksModule {}
