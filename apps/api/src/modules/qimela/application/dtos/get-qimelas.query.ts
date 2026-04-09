import { QimelaStatus } from '../../domain/qimela-status.enum';

export interface GetQimelasQuery {
  userId: string;
  status?: QimelaStatus;
}
