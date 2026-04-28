import { Inject, Injectable } from '@nestjs/common';
import { SPORT_REPOSITORY, SportRepository } from '../../domain/sport.repository';
import { SportDto } from '../dtos/sport.dto';
import { SportMapper } from '../mappers/sport.mapper';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface GetSportsResponse {
  data: SportDto[];
}

@Injectable()
export class GetSportsUseCase {

  constructor(
    @InjectPinoLogger(GetSportsUseCase.name) private readonly logger: PinoLogger,
    @Inject(SPORT_REPOSITORY)
    private readonly sportRepository: SportRepository,
  ) {}

  async execute(): Promise<GetSportsResponse> {
    this.logger.info('Fetching all sports');

    const sports = await this.sportRepository.findAll();
    const data: SportDto[] = SportMapper.toDtoList(sports);

    this.logger.info(`Found ${data.length} sports`);

    return { data };
  }
}
