import { User as PrismaUser, UserRole as PrismaUserRole } from '@prisma/client';
import { UserEntity } from '../../domain/user.entity';
import { UserRole } from '../../domain/user-role.enum';

export class UserPersistenceMapper {
  static toDomain(raw: PrismaUser): UserEntity {
    return new UserEntity({
      id: raw.id,
      email: raw.email,
      name: raw.name,
      passwordHash: raw.passwordHash,
      role: raw.role as unknown as UserRole,
      emailVerifiedAt: raw.emailVerifiedAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPrismaRole(role: UserRole): PrismaUserRole {
    return role as unknown as PrismaUserRole;
  }
}
