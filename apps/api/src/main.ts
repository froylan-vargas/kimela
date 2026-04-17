import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require("cookie-parser");
import { AppModule } from "./app.module";
import { LoggingInterceptor } from "./shared/interceptors/logging.interceptor";
import { AllExceptionsFilter } from "./shared/filters/all-exceptions.filter";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

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

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application listening on port ${port}`);
}

bootstrap();
