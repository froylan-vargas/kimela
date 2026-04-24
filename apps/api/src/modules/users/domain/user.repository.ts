import { UserEntity } from './user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  create(user: UserEntity): Promise<UserEntity>;
  verifyEmail(userId: string): Promise<void>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  updateProfile(userId: string, data: { name?: string; imageUrl?: string }): Promise<UserEntity>;
}
