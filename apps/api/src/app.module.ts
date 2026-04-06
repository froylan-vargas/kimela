import { Module } from '@nestjs/common';
import { PrismaModule } from './shared/prisma/prisma.module';
import { KimelaModule } from './modules/kimela/kimela.module';

@Module({
  imports: [PrismaModule, KimelaModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
