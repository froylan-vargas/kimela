import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PgBoss } from 'pg-boss';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class PgBossService implements OnModuleInit, OnModuleDestroy {
  readonly boss: PgBoss;

  constructor(
    @InjectPinoLogger(PgBossService.name) private readonly logger: PinoLogger,
  ) {
    const isProduction = process.env.NODE_ENV === 'production';
    this.boss = new PgBoss({
      connectionString: process.env.DATABASE_URL,
      ...(isProduction && { ssl: { rejectUnauthorized: false } }),
      monitorIntervalSeconds: 30,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.boss.start();
    this.logger.info('PgBoss started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.boss.stop();
    this.logger.info('PgBoss stopped');
  }
}
