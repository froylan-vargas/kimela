import { QimelaEntity } from './qimela.entity';
import { QimelaStatus } from './qimela-status.enum';
import { CoveredStages } from './covered-stages.enum';

export const QIMELA_REPOSITORY = Symbol('QIMELA_REPOSITORY');

export interface FindForUserOptions {
  userId: string;
  status?: QimelaStatus;
}

export interface QimelaPatch {
  name?: string;
  coveredStages?: CoveredStages;
  startPhaseId?: string | null;
  endPhaseId?: string | null;
}

export interface QimelaRepository {
  findById(id: string): Promise<QimelaEntity | null>;
  findForUser(options: FindForUserOptions): Promise<QimelaEntity[]>;
  save(entity: QimelaEntity): Promise<QimelaEntity>;
  update(id: string, patch: QimelaPatch): Promise<QimelaEntity>;
}
