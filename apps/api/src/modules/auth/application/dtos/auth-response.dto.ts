import { UserRole } from '../../../users/domain/user-role.enum';

export interface AuthUserDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  emailVerifiedAt: Date | null;
  imageUrl: string | null;
}
