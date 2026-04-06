import { KimelaStatus } from '../../domain/kimela-status.enum';

export type KimelaRole = 'CREATOR' | 'SUBSCRIBER';

export interface KimelaDto {
  id: string;
  name: string;
  description: string | null;
  sport: string;
  status: KimelaStatus;
  role: KimelaRole;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedKimelaResponse {
  data: KimelaDto[];
  meta: {
    total: number;
  };
}
