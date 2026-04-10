import { SportEntity } from './sport.entity';

export const SPORT_REPOSITORY = Symbol('SPORT_REPOSITORY');

export interface SportRepository {
  findAll(): Promise<SportEntity[]>;
}
