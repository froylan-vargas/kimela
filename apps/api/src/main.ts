import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { Logger } from "nestjs-pino";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require("cookie-parser");
import { AppModule } from "./app.module";
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3001",
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  app.get(Logger).log(`Application listening on port ${port}`, "Bootstrap");
}

bootstrap();
