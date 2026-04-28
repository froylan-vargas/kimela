import { Inject, Injectable } from '@nestjs/common';
import { SPORT_REPOSITORY, SportRepository } from '../../../admin/domain/sport.repository';
import { SportDto } from '../../../admin/application/dtos/sport.dto';
import { SportMapper } from '../../../admin/application/mappers/sport.mapper';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface GetSportsForQimelaResponse {
  data: SportDto[];
}

@Injectable()
export class GetSportsForQimelaUseCase {

  constructor(
    @InjectPinoLogger(GetSportsForQimelaUseCase.name) private readonly logger: PinoLogger,
    @Inject(SPORT_REPOSITORY)
    private readonly sportRepository: SportRepository,
  ) {}

  async execute(): Promise<GetSportsForQimelaResponse> {
    this.logger.info('Fetching sports for qimela form');
    const sports = await this.sportRepository.findAll();
    return { data: SportMapper.toDtoList(sports) };
  }
}
