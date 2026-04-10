import { Inject, Injectable, Logger } from '@nestjs/common';
import { SESSION_REPOSITORY, SessionRepository } from '../../domain/session.repository';
import { SessionDto } from '../dtos/session.dto';
import { SessionMapper } from '../mappers/session.mapper';

export interface GetSessionsByPhaseQuery {
  phaseId: string;
}

export interface GetSessionsByPhaseResponse {
  data: SessionDto[];
}

@Injectable()
export class GetSessionsByPhaseUseCase {
  private readonly logger = new Logger(GetSessionsByPhaseUseCase.name);

  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepository,
  ) {}

  async execute(query: GetSessionsByPhaseQuery): Promise<GetSessionsByPhaseResponse> {
    this.logger.log(`Fetching sessions for phase ${query.phaseId}`);

    const sessions = await this.sessionRepository.findByPhase({ phaseId: query.phaseId });
    const data: SessionDto[] = SessionMapper.toDtoList(sessions);

    this.logger.log(`Found ${data.length} sessions for phase ${query.phaseId}`);

    return { data };
  }
}
