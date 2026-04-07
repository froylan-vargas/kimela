import { UserEntity } from '../../domain/user.entity';
import { UserDto } from '../dtos/user.dto';

export class UserMapper {
  static toDto(entity: UserEntity): UserDto {
    return {
      id: entity.id,
      email: entity.email,
      name: entity.name,
      role: entity.role,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
