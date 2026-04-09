import { QimelaEntity } from './qimela.entity';
import { QimelaStatus } from './qimela-status.enum';

export const QIMELA_REPOSITORY = Symbol('QIMELA_REPOSITORY');

export interface FindForUserOptions {
  userId: string;
  status?: QimelaStatus;
}

export interface QimelaRepository {
  findForUser(options: FindForUserOptions): Promise<QimelaEntity[]>;
}
