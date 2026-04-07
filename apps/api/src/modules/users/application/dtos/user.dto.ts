import { UserRole } from '../../domain/user-role.enum';

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}
