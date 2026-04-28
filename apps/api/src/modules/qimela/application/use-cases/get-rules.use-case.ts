import { Inject, Injectable } from '@nestjs/common';
import { RULE_REPOSITORY, RuleRepository } from '../../domain/rule.repository';
import { RuleDto } from '../dtos/rule.dto';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface GetRulesResponse {
  data: RuleDto[];
}

@Injectable()
export class GetRulesUseCase {

  constructor(
    @InjectPinoLogger(GetRulesUseCase.name) private readonly logger: PinoLogger,
    @Inject(RULE_REPOSITORY)
    private readonly ruleRepository: RuleRepository,
  ) {}

  async execute(): Promise<GetRulesResponse> {
    this.logger.info('Fetching all rules');
    const rules = await this.ruleRepository.findAll();
    return {
      data: rules.map((r) => ({
        id: r.id,
        slug: r.slug,
        question: r.question,
        sessionFormat: r.sessionFormat,
        minPoints: r.minPoints,
        maxPoints: r.maxPoints,
      })),
    };
  }
}
