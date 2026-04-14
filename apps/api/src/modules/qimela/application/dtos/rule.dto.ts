import { SessionFormat } from '../../../admin/domain/sport.entity';

export interface RuleDto {
  id: string;
  slug: string;
  question: string;
  sessionFormat: SessionFormat;
  minPoints: number;
  maxPoints: number;
}
