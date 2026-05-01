import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';
import { LoggerModule } from 'nestjs-pino';
import { IncomingMessage } from 'http';
import { PrismaModule } from './shared/prisma/prisma.module';
import { QimelaModule } from './modules/qimela/qimela.module';
import { AuthModule } from './modules/auth/presentation/auth.module';
import { JwtAuthGuard } from './modules/auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/presentation/guards/roles.guard';
import { CsrfGuard } from './modules/auth/presentation/guards/csrf.guard';
import { HealthController } from './health.controller';
import { JobsModule } from './modules/jobs/jobs.module';
import { AdminModule } from './modules/admin/presentation/admin.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
            : undefined,
        formatters: {
          level: (label: string) => ({ severity: label.toUpperCase() }),
        },
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
          remove: true,
        },
        customProps: (req: IncomingMessage & { user?: { id: string } }) => ({
          userId: req.user?.id ?? 'anonymous',
        }),
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    QimelaModule,
    AuthModule,
    JobsModule,
    AdminModule,
    UsersModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
