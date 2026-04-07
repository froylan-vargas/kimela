import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PgBoss } from 'pg-boss';

@Injectable()
export class PgBossService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PgBossService.name);
  readonly boss: PgBoss;

  constructor() {
    this.boss = new PgBoss({
      connectionString: process.env.DATABASE_URL,
      monitorIntervalSeconds: 30,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.boss.start();
    this.logger.log('PgBoss started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.boss.stop();
    this.logger.log('PgBoss stopped');
  }
}
