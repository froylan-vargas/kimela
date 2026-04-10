export type PhaseType = "REGULAR_SEASON" | "PLAYOFFS" | "OTHER";

export interface Phase {
  id: string;
  name: string;
  order: number;
  type: PhaseType;
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
