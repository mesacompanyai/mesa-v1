import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: config.get<string>("FRONTEND_URL") || true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const documentConfig = new DocumentBuilder()
    .setTitle("Mesa API")
    .setDescription("Backend API for Mesa WhatsApp, reservations, media, and AI workflows.")
    .setVersion("0.1.0")
    .build();
  const document = SwaggerModule.createDocument(app, documentConfig);
  SwaggerModule.setup("api/docs", app, document);

  const port = config.get<number>("PORT") || 3000;
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
