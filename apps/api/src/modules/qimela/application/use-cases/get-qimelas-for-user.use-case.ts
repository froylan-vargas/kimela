import { Inject, Injectable, Logger } from '@nestjs/common';
import { QIMELA_REPOSITORY, QimelaRepository } from '../../domain/qimela.repository';
import { GetQimelasQuery } from '../dtos/get-qimelas.query';
import { QimelaDto, PaginatedQimelaResponse } from '../dtos/qimela.dto';
import { QimelaMapper } from '../mappers/qimela.mapper';

@Injectable()
export class GetQimelasForUserUseCase {
  private readonly logger = new Logger(GetQimelasForUserUseCase.name);

  constructor(
    @Inject(QIMELA_REPOSITORY)
    private readonly qimelaRepository: QimelaRepository,
  ) {}

  async execute(query: GetQimelasQuery): Promise<PaginatedQimelaResponse> {
    this.logger.log(`Fetching qimelas for user ${query.userId}`, {
      status: query.status,
    });

    const qimelas = await this.qimelaRepository.findForUser({
      userId: query.userId,
      status: query.status,
    });

    const data: QimelaDto[] = QimelaMapper.toDtoList(qimelas, query.userId);

    this.logger.log(`Found ${data.length} qimelas for user ${query.userId}`);

    return {
      data,
      meta: {
        total: data.length,
      },
    };
  }
}
