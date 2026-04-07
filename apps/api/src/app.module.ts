import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './shared/prisma/prisma.module';
import { KimelaModule } from './modules/kimela/kimela.module';
import { AuthModule } from './modules/auth/presentation/auth.module';
import { JwtAuthGuard } from './modules/auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/presentation/guards/roles.guard';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    KimelaModule,
    AuthModule,
  ],
  controllers: [],
  providers: [
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
