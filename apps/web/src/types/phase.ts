export type PhaseType = "REGULAR_SEASON" | "PLAYOFFS" | "OTHER";

export type PhaseStatus = "UPCOMING" | "ACTIVE" | "COMPLETED";

export interface Phase {
  id: string;
  name: string;
  order: number;
  type: PhaseType;
  status: PhaseStatus;
  eventId: string;
}

export interface CreatePhaseBody {
  name: string;
  type: PhaseType;
}

export interface ReorderPhaseEntry {
  id: string;
  order: number;
}
