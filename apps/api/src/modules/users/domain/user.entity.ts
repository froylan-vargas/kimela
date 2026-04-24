import { UserRole } from './user-role.enum';

export interface UserProps {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  emailVerifiedAt: Date | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class UserEntity {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly passwordHash: string;
  readonly role: UserRole;
  readonly emailVerifiedAt: Date | null;
  readonly imageUrl: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.name = props.name;
    this.passwordHash = props.passwordHash;
    this.role = props.role;
    this.emailVerifiedAt = props.emailVerifiedAt;
    this.imageUrl = props.imageUrl;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }
}
