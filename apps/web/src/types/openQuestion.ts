export type OpenQuestionStatus = "HIDDEN" | "VISIBLE";

export interface AdminOpenQuestion {
  id: string;
  eventId: string;
  prompt: string;
  status: OpenQuestionStatus;
  order: number;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QimelaOpenQuestion {
  id: string;
  prompt: string;
  answered: boolean;
  answer: {
    id: string;
    answer: string;
    createdAt: string;
  } | null;
}
