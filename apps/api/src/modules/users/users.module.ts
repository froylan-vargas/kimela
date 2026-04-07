import { Module } from '@nestjs/common';
import { UsersInfrastructureModule } from './infrastructure/users.infrastructure.module';
import { USER_REPOSITORY } from './domain/user.repository';

@Module({
  imports: [UsersInfrastructureModule],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
