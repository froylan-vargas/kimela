import { QimelaStatus } from './qimela-status.enum';

export interface QimelaProps {
  id: string;
  name: string;
  description: string | null;
  sport: string;
  status: QimelaStatus;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class QimelaEntity {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly sport: string;
  readonly status: QimelaStatus;
  readonly creatorId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: QimelaProps) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.sport = props.sport;
    this.status = props.status;
    this.creatorId = props.creatorId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  isCreatedBy(userId: string): boolean {
    return this.creatorId === userId;
  }
}
