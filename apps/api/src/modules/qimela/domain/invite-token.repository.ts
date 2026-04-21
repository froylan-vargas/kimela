import { InviteTokenEntity } from './invite-token.entity';

export const INVITE_TOKEN_REPOSITORY = Symbol('INVITE_TOKEN_REPOSITORY');

export interface InviteTokenRepository {
  findByToken(token: string): Promise<InviteTokenEntity | null>;
  findByQimelaId(qimelaId: string): Promise<InviteTokenEntity | null>;
  /** Creates or replaces the token for a qimela (handles the unique-per-qimela constraint). */
  upsert(entity: InviteTokenEntity): Promise<InviteTokenEntity>;
  revoke(id: string): Promise<void>;
  revokeByQimelaId(qimelaId: string): Promise<void>;
}
