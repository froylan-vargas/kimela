export type AuthRole = "USER" | "ADMIN";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  emailVerifiedAt: string | null;
  imageUrl: string | null;
}
