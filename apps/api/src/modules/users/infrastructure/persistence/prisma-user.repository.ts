import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { UserEntity } from '../../domain/user.entity';
import { UserRepository } from '../../domain/user.repository';
import { UserPersistenceMapper } from './user-persistence.mapper';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  private readonly logger = new Logger(PrismaUserRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserEntity | null> {
    this.logger.debug(`Finding user by id: ${id}`);
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record ? UserPersistenceMapper.toDomain(record) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    this.logger.debug(`Finding user by email: ${email}`);
    const record = await this.prisma.user.findUnique({ where: { email } });
    return record ? UserPersistenceMapper.toDomain(record) : null;
  }

  async create(user: UserEntity): Promise<UserEntity> {
    this.logger.debug(`Creating user with email: ${user.email}`);
    const record = await this.prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        passwordHash: user.passwordHash,
        role: UserPersistenceMapper.toPrismaRole(user.role),
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
    return UserPersistenceMapper.toDomain(record);
  }

  async verifyEmail(userId: string): Promise<void> {
    this.logger.debug(`Verifying email for user: ${userId}`);
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    this.logger.debug(`Updating password for user: ${userId}`);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }
}
