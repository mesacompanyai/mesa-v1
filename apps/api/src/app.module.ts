import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AiModule } from "./ai/ai.module";
import { AuthModule } from "./auth/auth.module";
import { ConfigurationModule } from "./configuration/configuration.module";
import { validateEnvironment } from "./config/environment";
import { HealthModule } from "./health/health.module";
import { MediaModule } from "./media/media.module";
import { PrismaModule } from "./prisma/prisma.module";
import { QueuesModule } from "./queues/queues.module";
import { ReservationsModule } from "./reservations/reservations.module";
import { StorageModule } from "./storage/storage.module";
import { TenantContextModule } from "./tenancy/tenant-context.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { WhatsappModule } from "./whatsapp/whatsapp.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    PrismaModule,
    TenantContextModule,
    AuthModule,
    QueuesModule,
    StorageModule,
    AiModule,
    WhatsappModule,
    HealthModule,
    WebhooksModule,
    MediaModule,
    ConfigurationModule,
    ReservationsModule,
  ],
})
export class AppModule {}
