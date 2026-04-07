export type KimelaRole = "CREATOR" | "SUBSCRIBER";
export type KimelaStatus = "ACTIVE" | "INACTIVE" | string;

export interface Kimela {
  id: string;
  name: string;
  description: string;
  sport: string;
  status: KimelaStatus;
  role: KimelaRole;
  creatorId: string;
}

export interface KimelasMeta {
  total: number;
  page: number;
  limit: number;
}

export interface KimelasResponse {
  data: Kimela[];
  meta: KimelasMeta;
}
