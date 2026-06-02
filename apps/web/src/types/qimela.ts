import type { SessionFormat } from "./sport";

export type QimelaRole = "CREATOR" | "SUBSCRIBER";
export type QimelaStatus = "ACTIVE" | "INACTIVE" | string;

export interface QimelaEventPhase {
  id: string;
  name: string;
  order: number;
  status: string;
}

export interface qimela {
  id: string;
  name: string;
  sportId: string;
  status: QimelaStatus;
  role: QimelaRole;
  creatorId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface QimelasMeta {
  total: number;
  page: number;
  limit: number;
}

export interface QimelasResponse {
  data: qimela[];
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
  phases: QimelaEventPhase[];
}

export interface Rule {
  id: string;
  slug: string;
  question: string;
  sessionFormat: SessionFormat;
  minPoints: number;
  maxPoints: number;
}

export interface QimelaDetailPhase {
  id: string;
  name: string;
  order: number;
  status: string;
}

export interface QimelaDetailRule {
  id: string;
  ruleId: string;
  slug: string;
  question: string;
  points: number;
  minPoints: number;
  maxPoints: number;
}

export interface QimelaDetail {
  id: string;
  name: string;
  sportId: string;
  status: string;
  startPhaseId: string | null;
  endPhaseId: string | null;
  creatorId: string;
  eventId: string | null;
  isSubscribed: boolean;
  phases: QimelaDetailPhase[];
  rules: QimelaDetailRule[];
}

export interface CreateQimelaBody {
  name: string;
  sportId: string;
  eventId: string;
  leagueId: string;
  initialPhaseId: string;
  finalPhaseId: string;
  rules: { ruleId: string; points: number }[];
}

export interface UpdateQimelaBody {
  name?: string;
  initialPhaseId?: string;
  finalPhaseId?: string;
  rules?: { ruleId: string; points: number }[];
}
