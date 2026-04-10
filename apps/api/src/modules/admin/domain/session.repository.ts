import { SessionEntity } from './session.entity';

export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');

export interface FindSessionsByPhaseOptions {
  phaseId: string;
}

export interface SessionRow {
  homeName: string;
  awayName: string;
  scheduledAt: Date;
}

export interface ReplaceSessionsForPhaseOptions {
  phaseId: string;
  eventId: string;
  sportId: string;
  rows: SessionRow[];
}

export interface SessionRepository {
  findByPhase(options: FindSessionsByPhaseOptions): Promise<SessionEntity[]>;
  replaceForPhase(options: ReplaceSessionsForPhaseOptions): Promise<SessionEntity[]>;
}
