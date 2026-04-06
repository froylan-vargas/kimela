import { KimelaStatus } from '../../domain/kimela-status.enum';

export interface GetKimelasQuery {
  userId: string;
  status?: KimelaStatus;
}
