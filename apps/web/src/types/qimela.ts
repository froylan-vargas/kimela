export type QimelaRole = "CREATOR" | "SUBSCRIBER";
export type QimelaStatus = "ACTIVE" | "INACTIVE" | string;

export interface Qimela {
  id: string;
  name: string;
  description: string;
  sport: string;
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
