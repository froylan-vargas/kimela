export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export interface RefreshTokenProps {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export class RefreshTokenEntity {
  readonly id: string;
  readonly tokenHash: string;
  readonly userId: string;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly createdAt: Date;

  constructor(props: RefreshTokenProps) {
    this.id = props.id;
    this.tokenHash = props.tokenHash;
    this.userId = props.userId;
    this.expiresAt = props.expiresAt;
    this.revokedAt = props.revokedAt;
    this.createdAt = props.createdAt;
  }

  isValid(): boolean {
    return !this.revokedAt && this.expiresAt > new Date();
  }
}

export interface RefreshTokenRepository {
  findByHash(tokenHash: string): Promise<RefreshTokenEntity | null>;
  create(token: RefreshTokenEntity): Promise<void>;
  revoke(id: string): Promise<void>;
  revokeAllByUserId(userId: string): Promise<void>;
}
