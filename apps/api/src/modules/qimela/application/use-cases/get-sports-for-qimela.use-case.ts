import { Inject, Injectable, Logger } from '@nestjs/common';
import { SPORT_REPOSITORY, SportRepository } from '../../../admin/domain/sport.repository';
import { SportDto } from '../../../admin/application/dtos/sport.dto';
import { SportMapper } from '../../../admin/application/mappers/sport.mapper';

export interface GetSportsForQimelaResponse {
  data: SportDto[];
}

@Injectable()
export class GetSportsForQimelaUseCase {
  private readonly logger = new Logger(GetSportsForQimelaUseCase.name);

  constructor(
    @Inject(SPORT_REPOSITORY)
    private readonly sportRepository: SportRepository,
  ) {}

  async execute(): Promise<GetSportsForQimelaResponse> {
    this.logger.log('Fetching sports for qimela form');
    const sports = await this.sportRepository.findAll();
    return { data: SportMapper.toDtoList(sports) };
  }
}
