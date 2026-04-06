import { KimelaEntity } from './kimela.entity';
import { KimelaStatus } from './kimela-status.enum';

export const KIMELA_REPOSITORY = Symbol('KIMELA_REPOSITORY');

export interface FindForUserOptions {
  userId: string;
  status?: KimelaStatus;
}

export interface KimelaRepository {
  findForUser(options: FindForUserOptions): Promise<KimelaEntity[]>;
}
