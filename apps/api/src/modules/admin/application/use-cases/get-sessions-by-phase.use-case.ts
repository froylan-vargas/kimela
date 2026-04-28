import { Inject, Injectable } from '@nestjs/common';
import { SESSION_REPOSITORY, SessionRepository } from '../../domain/session.repository';
import { SessionDto } from '../dtos/session.dto';
import { SessionMapper } from '../mappers/session.mapper';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface GetSessionsByPhaseQuery {
  phaseId: string;
}

export interface GetSessionsByPhaseResponse {
  data: SessionDto[];
}

@Injectable()
export class GetSessionsByPhaseUseCase {

  constructor(
    @InjectPinoLogger(GetSessionsByPhaseUseCase.name) private readonly logger: PinoLogger,
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepository,
  ) {}

  async execute(query: GetSessionsByPhaseQuery): Promise<GetSessionsByPhaseResponse> {
    this.logger.info(`Fetching sessions for phase ${query.phaseId}`);

    const sessions = await this.sessionRepository.findByPhase({ phaseId: query.phaseId });
    const data: SessionDto[] = SessionMapper.toDtoList(sessions);

    this.logger.info(`Found ${data.length} sessions for phase ${query.phaseId}`);

    return { data };
  }
}
