export type SessionStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';

export interface ContenderInfo {
  id: string;
  name: string;
  imgUrl: string | null;
}

export interface SessionScoreResult {
  home: string | null;
  away: string | null;
}

export interface SessionProps {
  id: string;
  name: string;
  scheduledAt: Date;
  status: SessionStatus;
  phaseId: string;
  sportId: string;
  home: ContenderInfo;
  away: ContenderInfo;
  score: SessionScoreResult;
}

export class SessionEntity {
  readonly id: string;
  readonly name: string;
  readonly scheduledAt: Date;
  readonly status: SessionStatus;
  readonly phaseId: string;
  readonly sportId: string;
  readonly home: ContenderInfo;
  readonly away: ContenderInfo;
  readonly score: SessionScoreResult;

  constructor(props: SessionProps) {
    this.id = props.id;
    this.name = props.name;
    this.scheduledAt = props.scheduledAt;
    this.status = props.status;
    this.phaseId = props.phaseId;
    this.sportId = props.sportId;
    this.home = props.home;
    this.away = props.away;
    this.score = props.score;
  }
}
