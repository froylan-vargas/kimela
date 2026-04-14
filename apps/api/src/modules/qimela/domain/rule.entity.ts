import { SessionFormat } from '../../admin/domain/sport.entity';

export interface RuleProps {
  id: string;
  slug: string;
  question: string;
  sessionFormat: SessionFormat;
  minPoints: number;
  maxPoints: number;
}

export class RuleEntity {
  readonly id: string;
  readonly slug: string;
  readonly question: string;
  readonly sessionFormat: SessionFormat;
  readonly minPoints: number;
  readonly maxPoints: number;

  constructor(props: RuleProps) {
    this.id = props.id;
    this.slug = props.slug;
    this.question = props.question;
    this.sessionFormat = props.sessionFormat;
    this.minPoints = props.minPoints;
    this.maxPoints = props.maxPoints;
  }
}
