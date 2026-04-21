import { randomUUID } from 'crypto';
import { QimelaStatus } from './qimela-status.enum';

export interface QimelaRuleProps {
  ruleId: string;
  points: number;
}

export interface QimelaProps {
  id: string;
  name: string;
  status: QimelaStatus;
  sportId: string;
  eventId: string | null;
  leagueId: string | null;
  creatorId: string;
  rules: QimelaRuleProps[];
  startPhaseId: string | null;
  endPhaseId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQimelaProps {
  name: string;
  sportId: string;
  eventId: string;
  leagueId: string;
  creatorId: string;
  rules: QimelaRuleProps[];
  startPhaseId: string | null;
  endPhaseId: string | null;
  status?: QimelaStatus;
}

export class QimelaEntity {
  readonly id: string;
  readonly name: string;
  readonly status: QimelaStatus;
  readonly sportId: string;
  readonly eventId: string | null;
  readonly leagueId: string | null;
  readonly creatorId: string;
  readonly rules: QimelaRuleProps[];
  readonly startPhaseId: string | null;
  readonly endPhaseId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: QimelaProps) {
    this.id = props.id;
    this.name = props.name;
    this.status = props.status;
    this.sportId = props.sportId;
    this.eventId = props.eventId;
    this.leagueId = props.leagueId;
    this.creatorId = props.creatorId;
    this.rules = props.rules;
    this.startPhaseId = props.startPhaseId;
    this.endPhaseId = props.endPhaseId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: CreateQimelaProps): QimelaEntity {
    return new QimelaEntity({
      id: randomUUID(),
      name: props.name,
      status: props.status ?? QimelaStatus.UPCOMING,
      sportId: props.sportId,
      eventId: props.eventId,
      leagueId: props.leagueId,
      creatorId: props.creatorId,
      rules: props.rules,
      startPhaseId: props.startPhaseId,
      endPhaseId: props.endPhaseId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  isCreatedBy(userId: string): boolean {
    return this.creatorId === userId;
  }
}
