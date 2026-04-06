import { Inject, Injectable, Logger } from '@nestjs/common';
import { KIMELA_REPOSITORY, KimelaRepository } from '../../domain/kimela.repository';
import { GetKimelasQuery } from '../dtos/get-kimelas.query';
import { KimelaDto, PaginatedKimelaResponse } from '../dtos/kimela.dto';
import { KimelaMapper } from '../mappers/kimela.mapper';

@Injectable()
export class GetKimelasForUserUseCase {
  private readonly logger = new Logger(GetKimelasForUserUseCase.name);

  constructor(
    @Inject(KIMELA_REPOSITORY)
    private readonly kimelaRepository: KimelaRepository,
  ) {}

  async execute(query: GetKimelasQuery): Promise<PaginatedKimelaResponse> {
    this.logger.log(`Fetching kimelas for user ${query.userId}`, {
      status: query.status,
    });

    const kimelas = await this.kimelaRepository.findForUser({
      userId: query.userId,
      status: query.status,
    });

    const data: KimelaDto[] = KimelaMapper.toDtoList(kimelas, query.userId);

    this.logger.log(`Found ${data.length} kimelas for user ${query.userId}`);

    return {
      data,
      meta: {
        total: data.length,
      },
    };
  }
}
