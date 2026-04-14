import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { RuleEntity } from '../../domain/rule.entity';
import { RuleRepository } from '../../domain/rule.repository';
import { SessionFormat } from '../../../admin/domain/sport.entity';

@Injectable()
export class PrismaRuleRepository implements RuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<RuleEntity[]> {
    const records = await this.prisma.rule.findMany({ orderBy: { slug: 'asc' } });
    return records.map((r) => new RuleEntity({
      id: r.id,
      slug: r.slug,
      question: r.question,
      sessionFormat: r.sessionFormat as SessionFormat,
      minPoints: r.minPoints,
      maxPoints: r.maxPoints,
    }));
  }

  async findByIds(ids: string[]): Promise<RuleEntity[]> {
    const records = await this.prisma.rule.findMany({ where: { id: { in: ids } } });
    return records.map((r) => new RuleEntity({
      id: r.id,
      slug: r.slug,
      question: r.question,
      sessionFormat: r.sessionFormat as SessionFormat,
      minPoints: r.minPoints,
      maxPoints: r.maxPoints,
    }));
  }
}
