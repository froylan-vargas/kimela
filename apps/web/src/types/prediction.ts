import type { Session } from "@/types/session";

export interface PredictionPick {
  pickCategoryId: string;
  name: string;
  label: string;
  valueType: "CONTENDER" | "SCALAR";
  value: string | null;
  pickedContenderId: string | null;
}

export interface SessionPrediction extends Session {
  phaseId: string;
  phaseName: string;
  picks: PredictionPick[];
  hasUserPicks: boolean;
}

export interface PhaseSessionsGroup {
  phaseId: string;
  phaseName: string;
  phaseOrder: number;
  sessions: SessionPrediction[];
}

export interface SavePredictionPickInput {
  pickCategoryId: string;
  value?: string;
  pickedContenderId?: string;
}
