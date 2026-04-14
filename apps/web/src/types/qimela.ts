import type { SessionFormat } from "./sport";

export type QimelaRole = "CREATOR" | "SUBSCRIBER";
export type QimelaStatus = "ACTIVE" | "INACTIVE" | string;
export type CoveredStages = "REGULAR_SEASON" | "PLAYOFFS" | "FULL";

export interface Qimela {
  id: string;
  name: string;
  sportId: string;
  status: QimelaStatus;
  role: QimelaRole;
  creatorId: string;
}

export interface QimelasMeta {
  total: number;
  page: number;
  limit: number;
}

export interface QimelasResponse {
  data: Qimela[];
  meta: QimelasMeta;
}

export interface QimelaEvent {
  id: string;
  name: string;
  leagueId: string;
  leagueName: string;
  status: string;
  startsAt: string;
  endsAt: string | null;
  availableCoveredStages: CoveredStages[];
}

export interface Rule {
  id: string;
  slug: string;
  question: string;
  sessionFormat: SessionFormat;
  minPoints: number;
  maxPoints: number;
}

export interface QimelaDetail {
  id: string;
  name: string;
  sportId: string;
  status: string;
  coveredStages: CoveredStages;
  startPhaseId: string | null;
  endPhaseId: string | null;
  creatorId: string;
}

export interface CreateQimelaBody {
  name: string;
  sportId: string;
  eventId: string;
  leagueId: string;
  coveredStages: CoveredStages;
  rules: { ruleId: string; points: number }[];
}

export interface UpdateQimelaBody {
  name?: string;
  coveredStages?: CoveredStages;
}
