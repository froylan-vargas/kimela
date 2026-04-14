import { RuleEntity } from './rule.entity';

export const RULE_REPOSITORY = Symbol('RULE_REPOSITORY');

export interface RuleRepository {
  findAll(): Promise<RuleEntity[]>;
  findByIds(ids: string[]): Promise<RuleEntity[]>;
}
