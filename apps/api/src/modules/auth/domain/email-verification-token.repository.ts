export const EMAIL_VERIFICATION_TOKEN_REPOSITORY = Symbol('EMAIL_VERIFICATION_TOKEN_REPOSITORY');

export class EmailVerificationTokenEntity {
  readonly id: string;
  readonly tokenHash: string;
  readonly userId: string;
  readonly expiresAt: Date;
  readonly usedAt: Date | null;
  readonly createdAt: Date;

  constructor(props: {
    id: string;
    tokenHash: string;
    userId: string;
    expiresAt: Date;
    usedAt: Date | null;
    createdAt: Date;
  }) {
    this.id = props.id;
    this.tokenHash = props.tokenHash;
    this.userId = props.userId;
    this.expiresAt = props.expiresAt;
    this.usedAt = props.usedAt;
    this.createdAt = props.createdAt;
  }

  isValid(): boolean {
    return !this.usedAt && this.expiresAt > new Date();
  }
}

export interface EmailVerificationTokenRepository {
  findByHash(tokenHash: string): Promise<EmailVerificationTokenEntity | null>;
  create(token: EmailVerificationTokenEntity): Promise<void>;
  markUsed(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}
