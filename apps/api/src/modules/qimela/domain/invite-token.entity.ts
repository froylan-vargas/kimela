import { randomBytes } from 'crypto';

export interface InviteTokenProps {
  id: string;
  token: string;
  qimelaId: string;
  revoked: boolean;
  createdAt: Date;
}

export class InviteTokenEntity {
  readonly id: string;
  readonly token: string;
  readonly qimelaId: string;
  readonly revoked: boolean;
  readonly createdAt: Date;

  constructor(props: InviteTokenProps) {
    this.id = props.id;
    this.token = props.token;
    this.qimelaId = props.qimelaId;
    this.revoked = props.revoked;
    this.createdAt = props.createdAt;
  }

  static create(qimelaId: string): InviteTokenEntity {
    return new InviteTokenEntity({
      id: randomBytes(16).toString('hex'),
      token: randomBytes(32).toString('hex'),
      qimelaId,
      revoked: false,
      createdAt: new Date(),
    });
  }

  isActive(): boolean {
    return !this.revoked;
  }
}
