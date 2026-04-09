import { QimelaStatus } from '../../domain/qimela-status.enum';

export type QimelaRole = 'CREATOR' | 'SUBSCRIBER';

export interface QimelaDto {
  id: string;
  name: string;
  description: string | null;
  sport: string;
  status: QimelaStatus;
  role: QimelaRole;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedQimelaResponse {
  data: QimelaDto[];
  meta: {
    total: number;
  };
}
