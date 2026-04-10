import { Inject, Injectable, Logger } from '@nestjs/common';
import { SPORT_REPOSITORY, SportRepository } from '../../domain/sport.repository';
import { SportDto } from '../dtos/sport.dto';
import { SportMapper } from '../mappers/sport.mapper';

export interface GetSportsResponse {
  data: SportDto[];
}

@Injectable()
export class GetSportsUseCase {
  private readonly logger = new Logger(GetSportsUseCase.name);

  constructor(
    @Inject(SPORT_REPOSITORY)
    private readonly sportRepository: SportRepository,
  ) {}

  async execute(): Promise<GetSportsResponse> {
    this.logger.log('Fetching all sports');

    const sports = await this.sportRepository.findAll();
    const data: SportDto[] = SportMapper.toDtoList(sports);

    this.logger.log(`Found ${data.length} sports`);

    return { data };
  }
}
