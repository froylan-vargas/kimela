import { Inject, Injectable, Logger } from '@nestjs/common';
import { QIMELA_REPOSITORY, QimelaRepository } from '../../domain/qimela.repository';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { GetQimelasQuery } from '../dtos/get-qimelas.query';
import { QimelaDto, PaginatedQimelaResponse } from '../dtos/qimela.dto';
import { QimelaMapper } from '../mappers/qimela.mapper';

@Injectable()
export class GetQimelasForUserUseCase {
  private readonly logger = new Logger(GetQimelasForUserUseCase.name);

  constructor(
    @Inject(QIMELA_REPOSITORY)
    private readonly qimelaRepository: QimelaRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(query: GetQimelasQuery): Promise<PaginatedQimelaResponse> {
    this.logger.log(`Fetching qimelas for user ${query.userId}`, {
      status: query.status,
    });

    const [qimelas, subscriptions] = await Promise.all([
      this.qimelaRepository.findForUser({
        userId: query.userId,
        status: query.status,
      }),
      this.prisma.subscription.findMany({
        where: { userId: query.userId },
        select: { qimelaId: true },
      }),
    ]);

    const subscribedIds = new Set(subscriptions.map((s) => s.qimelaId));

    const data: QimelaDto[] = [];
    for (const qimela of qimelas) {
      if (qimela.isCreatedBy(query.userId)) {
        data.push(QimelaMapper.toDto(qimela, query.userId, 'CREATOR'));
        if (subscribedIds.has(qimela.id)) {
          data.push(QimelaMapper.toDto(qimela, query.userId, 'SUBSCRIBER'));
        }
      } else {
        data.push(QimelaMapper.toDto(qimela, query.userId, 'SUBSCRIBER'));
      }
    }

    this.logger.log(`Found ${data.length} qimelas for user ${query.userId}`);

    return {
      data,
      meta: {
        total: data.length,
      },
    };
  }
}
